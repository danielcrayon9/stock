import { getStocksByMarket } from "@/config/markets";
import { MAX_SCAN_UNIVERSE } from "@/lib/constants";
import {
  getRows,
  hasGoogleSheetsConfig,
  overwriteRows,
} from "@/lib/googleSheets";
import { nowIso } from "@/lib/utils";
import type { Stock, UniverseConstituent, UniverseType } from "@/lib/types";

/**
 * 주의: 공식 KOSPI 200 / KOSDAQ 150 전체 구성종목은 KRX 등 권위 있는 외부 소스에서
 * 주기적으로 갱신해야 합니다. 외부 소스가 연결되지 않은 환경에서는 번들된 대표 종목
 * 시드로 유니버스를 구성하며, 이는 "데이터 부족" 상태로 간주합니다.
 */

type UniverseSource = "sheet" | "seed";

export type UniverseResult = {
  type: UniverseType;
  stocks: Stock[];
  source: UniverseSource;
  message: string;
};

function seedKospi(): Stock[] {
  return getStocksByMarket("KOSPI");
}

function seedKosdaq(): Stock[] {
  return getStocksByMarket("KOSDAQ");
}

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
    market: (row.market as Stock["market"]) ?? "UNKNOWN",
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

function rankTopByLiquidity(constituents: UniverseConstituent[], limit: number): UniverseConstituent[] {
  return [...constituents]
    .sort((left, right) => {
      const leftKey = (left.marketCap ?? 0) + (left.avgTradingValue20 ?? 0);
      const rightKey = (right.marketCap ?? 0) + (right.avgTradingValue20 ?? 0);
      return rightKey - leftKey;
    })
    .slice(0, limit);
}

function dedupeStocks(stocks: Stock[]): Stock[] {
  const seen = new Set<string>();
  const result: Stock[] = [];
  for (const stock of stocks) {
    if (seen.has(stock.stockCode)) continue;
    seen.add(stock.stockCode);
    result.push(stock);
  }
  return result;
}

/**
 * KOSDAQ 150 중 시가총액/거래대금/유동성 기준 상위 100개를 선정한다.
 * 캐시 데이터에 시총·거래대금이 없으면 시드 순서를 사용한다.
 */
function buildKosdaq100(cached: UniverseConstituent[], fallback: Stock[]): Stock[] {
  const kosdaq = cached.filter((item) => item.market === "KOSDAQ");
  if (kosdaq.length > 100) {
    return rankTopByLiquidity(kosdaq, 100);
  }
  return fallback.slice(0, 100);
}

export async function getUniverse(type: UniverseType): Promise<UniverseResult> {
  const cached = await readCachedConstituents();
  const hasCache = cached.length > 0;

  const cachedKospi = cached.filter((item) => item.market === "KOSPI");
  const cachedKosdaq = cached.filter((item) => item.market === "KOSDAQ");

  let stocks: Stock[];
  switch (type) {
    case "KOSPI200":
      stocks = hasCache && cachedKospi.length > 0 ? cachedKospi : seedKospi();
      break;
    case "KOSDAQ150":
      stocks = hasCache && cachedKosdaq.length > 0 ? cachedKosdaq : seedKosdaq();
      break;
    case "KOSDAQ100":
      stocks = buildKosdaq100(cached, hasCache && cachedKosdaq.length > 0 ? cachedKosdaq : seedKosdaq());
      break;
    case "KOSPI200_KOSDAQ100": {
      const kospi = hasCache && cachedKospi.length > 0 ? cachedKospi : seedKospi();
      const kosdaq100 = buildKosdaq100(cached, hasCache && cachedKosdaq.length > 0 ? cachedKosdaq : seedKosdaq());
      stocks = [...kospi, ...kosdaq100];
      break;
    }
    case "CUSTOM":
    default:
      stocks = cached;
      break;
  }

  const deduped = dedupeStocks(stocks).slice(0, MAX_SCAN_UNIVERSE);

  return {
    type,
    stocks: deduped,
    source: hasCache ? "sheet" : "seed",
    message: hasCache
      ? "Google Sheets에 캐싱된 유니버스를 사용했습니다."
      : "외부 구성종목 소스가 없어 번들 시드 유니버스를 사용했습니다. (데이터 부족)",
  };
}

/**
 * 시드 기반 유니버스를 universe_constituents 시트에 캐싱한다.
 * 외부 권위 소스를 연결할 경우 이 함수에서 fetch 후 저장하도록 확장한다.
 */
export async function refreshUniverse(): Promise<{ count: number; message: string }> {
  if (!hasGoogleSheetsConfig()) {
    return { count: 0, message: "Google Sheets 환경변수가 없어 유니버스를 캐싱할 수 없습니다." };
  }

  const updatedAt = nowIso();
  const kospi = seedKospi().map((stock) => ({
    id: stock.stockCode,
    stockCode: stock.stockCode,
    stockName: stock.stockName,
    market: stock.market,
    universeType: "KOSPI200" as UniverseType,
    marketCap: "",
    avgTradingValue20: "",
    isActive: true,
    updatedAt,
  }));
  const kosdaq = seedKosdaq().map((stock) => ({
    id: stock.stockCode,
    stockCode: stock.stockCode,
    stockName: stock.stockName,
    market: stock.market,
    universeType: "KOSDAQ150" as UniverseType,
    marketCap: "",
    avgTradingValue20: "",
    isActive: true,
    updatedAt,
  }));

  const rows = [...kospi, ...kosdaq];
  await overwriteRows("universe_constituents", rows);

  return {
    count: rows.length,
    message: `시드 기반 유니버스 ${rows.length}종목을 캐싱했습니다. 공식 KOSPI200/KOSDAQ150 전체 구성종목은 외부 소스 연동 후 갱신하세요.`,
  };
}
