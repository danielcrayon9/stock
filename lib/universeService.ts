import { getStocksByMarket } from "@/config/markets";
import { MAX_SCAN_UNIVERSE } from "@/lib/constants";
import {
  getRows,
  hasGoogleSheetsConfig,
  overwriteRows,
} from "@/lib/googleSheets";
import { nowIso } from "@/lib/utils";
import type { Market, Stock, UniverseConstituent, UniverseType } from "@/lib/types";

/**
 * 공식 KOSPI 200 / KOSDAQ 150 구성종목은 KRX(한국거래소) 공개 데이터에서 갱신한다.
 * KRX 응답이 불가하면 번들된 대표 종목 시드로 폴백한다(데이터 부족 상태).
 */

type UniverseSource = "sheet" | "seed";

export type UniverseResult = {
  type: UniverseType;
  stocks: Stock[];
  source: UniverseSource;
  message: string;
};

export type UniverseConstituentsResult = {
  type: UniverseType;
  constituents: UniverseConstituent[];
  source: UniverseSource;
  message: string;
};

// ---------------------------------------------------------------------------
// 시드 폴백
// ---------------------------------------------------------------------------

function seedToConstituent(stock: Stock, universeType: UniverseType, updatedAt: string): UniverseConstituent {
  return {
    id: stock.stockCode,
    stockCode: stock.stockCode,
    stockName: stock.stockName,
    market: stock.market,
    universeType,
    marketCap: null,
    avgTradingValue20: null,
    isActive: true,
    updatedAt,
  };
}

function seedKospi(updatedAt = nowIso()): UniverseConstituent[] {
  return getStocksByMarket("KOSPI").map((stock) => seedToConstituent(stock, "KOSPI200", updatedAt));
}

function seedKosdaq(updatedAt = nowIso()): UniverseConstituent[] {
  return getStocksByMarket("KOSDAQ").map((stock) => seedToConstituent(stock, "KOSDAQ150", updatedAt));
}

// ---------------------------------------------------------------------------
// KRX 공식 구성종목 fetch
// ---------------------------------------------------------------------------

type KrxRow = {
  ISU_SRT_CD?: string;
  ISU_ABBRV?: string;
  TDD_CLSPRC?: string;
  MKTCAP?: string;
  ACC_TRDVAL?: string;
};

const KRX_ENDPOINT = "https://data.krx.co.kr/comm/bldAttendant/getJsonData.cmd";

// KRX 지수 코드: KOSPI 200 = (1, 028), KOSDAQ 150 = (2, 203)
const KRX_INDEX_CONFIG: Record<
  "KOSPI200" | "KOSDAQ150",
  { indIdx: string; indIdx2: string; indexName: string; market: Market }
> = {
  KOSPI200: { indIdx: "1", indIdx2: "028", indexName: "코스피 200", market: "KOSPI" },
  KOSDAQ150: { indIdx: "2", indIdx2: "203", indexName: "코스닥 150", market: "KOSDAQ" },
};

function parseKrxNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

/** 최근 영업일 후보(KST 기준, 주말 제외) YYYYMMDD 문자열 배열 */
function recentBusinessDays(count: number): string[] {
  const days: string[] = [];
  const baseKstMs = Date.now() + 9 * 60 * 60 * 1000;
  for (let i = 0; days.length < count && i < count + 6; i += 1) {
    const d = new Date(baseKstMs - i * 86_400_000);
    const weekday = d.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    days.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return days;
}

async function requestKrx(trdDd: string, config: (typeof KRX_INDEX_CONFIG)[keyof typeof KRX_INDEX_CONFIG]): Promise<KrxRow[]> {
  const body = new URLSearchParams({
    bld: "dbms/MDC/STAT/standard/MDCSTAT00601",
    locale: "ko_KR",
    tboxindIdx_finder_equidx0_2: config.indexName,
    indIdx: config.indIdx,
    indIdx2: config.indIdx2,
    codeNmindIdx_finder_equidx0_2: config.indexName,
    param1indIdx_finder_equidx0_2: "",
    trdDd,
    money: "1",
    csvxls_isNo: "false",
  });

  const response = await fetch(KRX_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent": "Mozilla/5.0",
      Referer: "http://data.krx.co.kr/contents/MDC/MDI/mdiLoader/index.cmd",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`KRX 응답 오류 (${response.status})`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const rows = (json.output ?? json.OutBlock_1 ?? json.block1 ?? []) as KrxRow[];
  return Array.isArray(rows) ? rows : [];
}

async function fetchKrxIndexConstituents(
  universeType: "KOSPI200" | "KOSDAQ150",
  updatedAt: string,
): Promise<UniverseConstituent[]> {
  const config = KRX_INDEX_CONFIG[universeType];

  for (const trdDd of recentBusinessDays(6)) {
    let rows: KrxRow[];
    try {
      rows = await requestKrx(trdDd, config);
    } catch {
      continue;
    }

    const mapped = rows
      .map((row): UniverseConstituent | null => {
        const stockCode = (row.ISU_SRT_CD ?? "").trim();
        const stockName = (row.ISU_ABBRV ?? "").trim();
        if (!/^\d{6}$/.test(stockCode) || !stockName) return null;
        return {
          id: stockCode,
          stockCode,
          stockName,
          market: config.market,
          universeType,
          marketCap: parseKrxNumber(row.MKTCAP),
          avgTradingValue20: parseKrxNumber(row.ACC_TRDVAL),
          isActive: true,
          updatedAt,
        };
      })
      .filter((item): item is UniverseConstituent => item != null);

    if (mapped.length > 0) return mapped;
  }

  return [];
}

// ---------------------------------------------------------------------------
// Naver Finance 공식 KOSPI 200 구성종목 (KRX 차단 시 폴백)
// ---------------------------------------------------------------------------

const NAVER_KOSPI200_URL = "https://finance.naver.com/sise/entryJongmok.naver?type=KPI200";
const NAVER_KOSPI200_PAGES = 20; // 페이지당 10종목 × 20 = 200종목

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchNaverPage(page: number): Promise<string> {
  const response = await fetch(`${NAVER_KOSPI200_URL}&page=${page}`, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Referer: "https://finance.naver.com/sise/",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Naver 응답 오류 (${response.status})`);
  }
  const buffer = await response.arrayBuffer();
  return new TextDecoder("euc-kr").decode(buffer);
}

async function fetchNaverKospi200(updatedAt: string): Promise<UniverseConstituent[]> {
  const map = new Map<string, string>();
  const pages = Array.from({ length: NAVER_KOSPI200_PAGES }, (_, i) => i + 1);

  for (let i = 0; i < pages.length; i += 5) {
    const batch = pages.slice(i, i + 5);
    const htmls = await Promise.all(batch.map((page) => fetchNaverPage(page).catch(() => "")));
    for (const html of htmls) {
      const re = /\/item\/main\.naver\?code=(\d{6})" target="_parent">([^<]+)<\/a>/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(html)) != null) {
        const code = match[1];
        const name = decodeHtmlEntities(match[2]);
        if (name && !map.has(code)) map.set(code, name);
      }
    }
  }

  return [...map.entries()].map(([stockCode, stockName]) => ({
    id: stockCode,
    stockCode,
    stockName,
    market: "KOSPI" as Market,
    universeType: "KOSPI200" as UniverseType,
    marketCap: null,
    avgTradingValue20: null,
    isActive: true,
    updatedAt,
  }));
}

// ---------------------------------------------------------------------------
// 캐시 읽기
// ---------------------------------------------------------------------------

type ConstituentRow = {
  id?: string;
  stockCode?: string;
  stockName?: string;
  market?: string;
  universeType?: string;
  marketCap?: string | number;
  avgTradingValue20?: string | number;
  isActive?: string | boolean;
  updatedAt?: string;
};

function toNumberOrNull(value: string | number | undefined): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function rowToConstituent(row: ConstituentRow): UniverseConstituent | null {
  if (!row.stockCode || !row.stockName) return null;
  return {
    id: String(row.id ?? row.stockCode),
    stockCode: String(row.stockCode),
    stockName: String(row.stockName),
    market: (row.market as Market) ?? "UNKNOWN",
    universeType: (row.universeType as UniverseType) ?? "CUSTOM",
    marketCap: toNumberOrNull(row.marketCap),
    avgTradingValue20: toNumberOrNull(row.avgTradingValue20),
    isActive: row.isActive === undefined ? true : row.isActive === true || row.isActive === "TRUE",
    updatedAt: String(row.updatedAt ?? ""),
  };
}

async function readCachedConstituents(): Promise<UniverseConstituent[]> {
  if (!hasGoogleSheetsConfig()) return [];
  try {
    const rows = await getRows<ConstituentRow>("universe_constituents");
    return rows
      .map(rowToConstituent)
      .filter((item): item is UniverseConstituent => item != null && item.isActive);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// 유니버스 구성
// ---------------------------------------------------------------------------

function rankTopByLiquidity(constituents: UniverseConstituent[], limit: number): UniverseConstituent[] {
  return [...constituents]
    .sort((left, right) => {
      const leftKey = (left.marketCap ?? 0) + (left.avgTradingValue20 ?? 0);
      const rightKey = (right.marketCap ?? 0) + (right.avgTradingValue20 ?? 0);
      return rightKey - leftKey;
    })
    .slice(0, limit);
}

function dedupe(constituents: UniverseConstituent[]): UniverseConstituent[] {
  const seen = new Set<string>();
  const result: UniverseConstituent[] = [];
  for (const item of constituents) {
    if (seen.has(item.stockCode)) continue;
    seen.add(item.stockCode);
    result.push(item);
  }
  return result;
}

/** KOSDAQ 150 중 시가총액/거래대금/유동성 상위 100개 선정 */
function buildKosdaq100(kosdaq: UniverseConstituent[]): UniverseConstituent[] {
  if (kosdaq.length > 100) return rankTopByLiquidity(kosdaq, 100);
  return kosdaq.slice(0, 100);
}

export async function getUniverseConstituents(type: UniverseType): Promise<UniverseConstituentsResult> {
  const cached = await readCachedConstituents();
  const hasCache = cached.length > 0;

  const kospiPool = hasCache && cached.some((c) => c.market === "KOSPI")
    ? cached.filter((c) => c.market === "KOSPI")
    : seedKospi();
  const kosdaqPool = hasCache && cached.some((c) => c.market === "KOSDAQ")
    ? cached.filter((c) => c.market === "KOSDAQ")
    : seedKosdaq();

  let constituents: UniverseConstituent[];
  switch (type) {
    case "KOSPI200":
      constituents = kospiPool;
      break;
    case "KOSDAQ150":
      constituents = kosdaqPool;
      break;
    case "KOSDAQ100":
      constituents = buildKosdaq100(kosdaqPool);
      break;
    case "KOSPI200_KOSDAQ100":
      constituents = [...kospiPool, ...buildKosdaq100(kosdaqPool)];
      break;
    case "CUSTOM":
    default:
      constituents = cached;
      break;
  }

  const deduped = dedupe(constituents).slice(0, MAX_SCAN_UNIVERSE);

  return {
    type,
    constituents: deduped,
    source: hasCache ? "sheet" : "seed",
    message: hasCache
      ? "Google Sheets에 캐싱된 유니버스를 사용했습니다."
      : "캐싱된 구성종목이 없어 번들 시드 유니버스를 사용했습니다. (데이터 부족) 유니버스 갱신을 실행하세요.",
  };
}

export async function getUniverse(type: UniverseType): Promise<UniverseResult> {
  const result = await getUniverseConstituents(type);
  return {
    type,
    stocks: result.constituents.map((c) => ({ stockCode: c.stockCode, stockName: c.stockName, market: c.market })),
    source: result.source,
    message: result.message,
  };
}

// ---------------------------------------------------------------------------
// 갱신 (KRX → 시드 폴백) + Google Sheets 캐싱
// ---------------------------------------------------------------------------

async function buildKospi200(updatedAt: string): Promise<{ list: UniverseConstituent[]; source: string }> {
  // 1순위: KRX(시가총액 포함). 2순위: Naver(코스피200 공식 구성). 3순위: 시드.
  try {
    const krx = await fetchKrxIndexConstituents("KOSPI200", updatedAt);
    if (krx.length >= 150) return { list: krx, source: "KRX" };
  } catch {
    // KRX 실패 시 Naver로 폴백
  }
  try {
    const naver = await fetchNaverKospi200(updatedAt);
    if (naver.length >= 150) return { list: naver, source: "Naver" };
    if (naver.length > 0) return { list: naver, source: "Naver(부분)" };
  } catch {
    // Naver 실패 시 시드로 폴백
  }
  return { list: seedKospi(updatedAt), source: "시드" };
}

async function buildKosdaq150(updatedAt: string): Promise<{ list: UniverseConstituent[]; source: string }> {
  // KOSDAQ 150 공식 목록은 KRX가 유일한 무료 소스이며, 차단 시 시드로 폴백한다.
  try {
    const krx = await fetchKrxIndexConstituents("KOSDAQ150", updatedAt);
    if (krx.length >= 100) return { list: krx, source: "KRX" };
    if (krx.length > 0) return { list: krx, source: "KRX(부분)" };
  } catch {
    // KRX 실패 시 시드로 폴백
  }
  return { list: seedKosdaq(updatedAt), source: "시드" };
}

export async function refreshUniverse(): Promise<{ count: number; source: string; message: string }> {
  if (!hasGoogleSheetsConfig()) {
    return { count: 0, source: "none", message: "Google Sheets 환경변수가 없어 유니버스를 캐싱할 수 없습니다." };
  }

  const updatedAt = nowIso();

  const [kospi, kosdaq] = await Promise.all([buildKospi200(updatedAt), buildKosdaq150(updatedAt)]);

  const rows = [...kospi.list, ...kosdaq.list].map((c) => ({ ...c }));
  await overwriteRows("universe_constituents", rows);

  const usedSeed = kospi.source.includes("시드") || kosdaq.source.includes("시드");
  const allOfficial = !kospi.source.includes("시드") && !kosdaq.source.includes("시드");
  const source = allOfficial ? "official" : usedSeed ? "mixed" : "official";

  return {
    count: rows.length,
    source,
    message: `KOSPI200 ${kospi.list.length}종목(${kospi.source}), KOSDAQ150 ${kosdaq.list.length}종목(${kosdaq.source})을 캐싱했습니다.`,
  };
}
