import { inflateRawSync } from "node:zlib";
import { appendRow, hasGoogleSheetsConfig } from "@/lib/googleSheets";
import { classifyDisclosure, calculateDisclosureScore } from "@/lib/disclosureAnalysis";
import { nowIso } from "@/lib/utils";
import type { DisclosureItem, DisclosureResult } from "@/lib/types";

type DartCompanyResponse = {
  status: string;
  message: string;
  corp_code?: string;
  corp_name?: string;
  stock_code?: string;
};

type DartDisclosureRow = {
  corp_name: string;
  stock_code: string;
  report_nm: string;
  rcept_no: string;
  rcept_dt: string;
};

type DartDisclosureResponse = {
  status: string;
  message: string;
  list?: DartDisclosureRow[];
};

export type DartFinancialRow = {
  account_nm: string;
  thstrm_amount?: string;
  frmtrm_amount?: string;
  fs_nm?: string;
  sj_nm?: string;
};

type DartFinancialResponse = {
  status: string;
  message: string;
  list?: DartFinancialRow[];
};

type CorpCodeInfo = {
  corpCode: string;
  stockName: string;
  stockCode: string;
};

const DART_BASE_URL = "https://opendart.fss.or.kr/api";
let corpCodeMapPromise: Promise<Map<string, CorpCodeInfo>> | null = null;
const DART_TIMEOUT_MS = 15_000;

function getDartApiKey() {
  return process.env.OPENDART_API_KEY?.trim();
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10).replace(/-/g, "");
}

function getDateRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days);
  return { bgn_de: formatDate(start), end_de: formatDate(end) };
}

async function requestDart<T>(path: string, params: Record<string, string>) {
  const apiKey = getDartApiKey();
  if (!apiKey) {
    throw new Error("OpenDART API 키가 설정되지 않았습니다.");
  }

  const query = new URLSearchParams({ crtfc_key: apiKey, ...params });
  const response = await fetchWithTimeout(`${DART_BASE_URL}/${path}?${query.toString()}`, DART_TIMEOUT_MS, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`OpenDART API 응답 오류 (${response.status})`);
  }

  return (await response.json()) as T;
}

async function fetchWithTimeout(url: string, timeoutMs: number, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function extractFirstXmlValue(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}>\\s*([^<]*)\\s*</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function unzipFirstXml(buffer: Buffer) {
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === eocdSignature) {
      eocdOffset = index;
      break;
    }
  }
  if (eocdOffset === -1) throw new Error("OpenDART corpCode ZIP 중앙 디렉터리를 찾지 못했습니다.");

  const entryCount = buffer.readUInt16LE(eocdOffset + 10);
  let centralOffset = buffer.readUInt32LE(eocdOffset + 16);

  for (let entry = 0; entry < entryCount; entry += 1) {
    if (buffer.readUInt32LE(centralOffset) !== 0x02014b50) {
      throw new Error("OpenDART corpCode ZIP 중앙 디렉터리 형식이 올바르지 않습니다.");
    }

    const compressionMethod = buffer.readUInt16LE(centralOffset + 10);
    const compressedSize = buffer.readUInt32LE(centralOffset + 20);
    const fileNameLength = buffer.readUInt16LE(centralOffset + 28);
    const extraLength = buffer.readUInt16LE(centralOffset + 30);
    const commentLength = buffer.readUInt16LE(centralOffset + 32);
    const localHeaderOffset = buffer.readUInt32LE(centralOffset + 42);
    const fileNameStart = centralOffset + 46;
    const fileName = buffer.subarray(fileNameStart, fileNameStart + fileNameLength).toString("utf8");

    if (fileName.toLowerCase().endsWith(".xml")) {
      if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
        throw new Error("OpenDART corpCode ZIP 로컬 헤더 형식이 올바르지 않습니다.");
      }
      const localFileNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
      const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

      if (compressionMethod === 0) return compressed.toString("utf8");
      if (compressionMethod === 8) return inflateRawSync(compressed).toString("utf8");
      throw new Error(`지원하지 않는 OpenDART ZIP 압축 방식입니다. (${compressionMethod})`);
    }

    centralOffset += 46 + fileNameLength + extraLength + commentLength;
  }

  throw new Error("OpenDART corpCode ZIP에서 XML 파일을 찾지 못했습니다.");
}

function parseCorpCodeXml(xml: string) {
  const map = new Map<string, CorpCodeInfo>();
  const listPattern = /<list>([\s\S]*?)<\/list>/g;
  let match: RegExpExecArray | null;

  while ((match = listPattern.exec(xml)) != null) {
    const item = match[1];
    const stockCode = extractFirstXmlValue(item, "stock_code");
    const corpCode = extractFirstXmlValue(item, "corp_code");
    const stockName = extractFirstXmlValue(item, "corp_name");
    if (/^\d{6}$/.test(stockCode) && corpCode) {
      map.set(stockCode, { corpCode, stockName: stockName || stockCode, stockCode });
    }
  }

  return map;
}

async function getCorpCodeMap() {
  if (corpCodeMapPromise) return corpCodeMapPromise;

  corpCodeMapPromise = (async () => {
    const apiKey = getDartApiKey();
    if (!apiKey) throw new Error("OpenDART API 키가 설정되지 않았습니다.");

    const response = await fetchWithTimeout(
      `${DART_BASE_URL}/corpCode.xml?${new URLSearchParams({ crtfc_key: apiKey })}`,
      DART_TIMEOUT_MS,
      { next: { revalidate: 60 * 60 * 24 } },
    );
    if (!response.ok) {
      throw new Error(`OpenDART 기업 고유번호 목록 응답 오류 (${response.status})`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const xml = unzipFirstXml(buffer);
    const map = parseCorpCodeXml(xml);
    if (map.size === 0) {
      throw new Error("OpenDART 기업 고유번호 목록에서 상장 종목을 찾지 못했습니다.");
    }
    return map;
  })();

  return corpCodeMapPromise;
}

export async function getCorpInfo(stockCode: string) {
  const normalizedCode = stockCode.trim();
  const map = await getCorpCodeMap();
  const corp = map.get(normalizedCode);
  if (!corp) {
    throw new Error(`OpenDART 기업 고유번호 목록에서 ${normalizedCode} 종목을 찾지 못했습니다.`);
  }

  const payload = await requestDart<DartCompanyResponse>("company.json", { corp_code: corp.corpCode });
  return {
    corpCode: corp.corpCode,
    stockName: payload.status === "000" ? payload.corp_name || corp.stockName : corp.stockName,
    stockCode: payload.status === "000" ? payload.stock_code || corp.stockCode : corp.stockCode,
  };
}

async function saveDisclosureCache(items: DisclosureItem[]) {
  if (!hasGoogleSheetsConfig()) return;

  await Promise.allSettled(
    items.slice(0, 20).map((item) =>
      appendRow("disclosure_cache", {
        id: crypto.randomUUID(),
        stockCode: item.stockCode,
        stockName: item.stockName,
        reportName: item.reportName,
        receivedAt: item.receivedAt,
        receiptNo: item.receiptNo,
        url: item.url,
        sentiment: item.sentiment,
        createdAt: nowIso(),
      }),
    ),
  );
}

export async function getDisclosures(stockCode: string, days = 90): Promise<DisclosureResult> {
  if (!getDartApiKey()) {
    return {
      items: [],
      status: "disabled",
      message: "OpenDART API 키가 설정되지 않았습니다.",
      disclosureScore: null,
      positiveCount: 0,
      negativeCount: 0,
    };
  }

  try {
    const corp = await getCorpInfo(stockCode);
    const range = getDateRange(days);
    const payload = await requestDart<DartDisclosureResponse>("list.json", {
      corp_code: corp.corpCode,
      bgn_de: range.bgn_de,
      end_de: range.end_de,
      page_count: "100",
    });

    if (payload.status === "013") {
      return {
        items: [],
        status: "data-unavailable",
        message: "조회 기간 내 공시 데이터가 없습니다.",
        disclosureScore: null,
        positiveCount: 0,
        negativeCount: 0,
      };
    }

    if (payload.status !== "000") {
      throw new Error(payload.message || "OpenDART 공시 목록 조회에 실패했습니다.");
    }

    const items = (payload.list ?? []).map((row): DisclosureItem => {
      const analysis = classifyDisclosure(row.report_nm);
      return {
        stockCode,
        stockName: row.corp_name || corp.stockName,
        reportName: row.report_nm,
        receivedAt: row.rcept_dt,
        receiptNo: row.rcept_no,
        url: `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${row.rcept_no}`,
        sentiment: analysis.sentiment,
        matchedKeywords: analysis.matchedKeywords,
      };
    });

    await saveDisclosureCache(items);

    return {
      items,
      status: "ready",
      message: `최근 ${days}일 공시 ${items.length}건을 조회했습니다.`,
      disclosureScore: calculateDisclosureScore(items),
      positiveCount: items.filter((item) => item.sentiment === "positive").length,
      negativeCount: items.filter((item) => item.sentiment === "negative").length,
    };
  } catch (error) {
    return {
      items: [],
      status: "data-unavailable",
      message: error instanceof Error ? error.message : "OpenDART 공시 데이터를 불러오지 못했습니다.",
      disclosureScore: null,
      positiveCount: 0,
      negativeCount: 0,
    };
  }
}

export async function getFinancialStatements(stockCode: string) {
  if (!getDartApiKey()) {
    return {
      rows: [] as DartFinancialRow[],
      status: "disabled" as const,
      message: "OpenDART API 키가 설정되지 않았습니다.",
    };
  }

  try {
    const corp = await getCorpInfo(stockCode);
    const currentYear = new Date().getFullYear();
    const attempts = [
      { year: currentYear, code: "11013", label: "1분기보고서" },
      { year: currentYear - 1, code: "11011", label: "사업보고서" },
      { year: currentYear - 1, code: "11014", label: "3분기보고서" },
      { year: currentYear - 1, code: "11012", label: "반기보고서" },
      { year: currentYear - 2, code: "11011", label: "사업보고서" },
    ];

    let lastMessage = "";
    for (const attempt of attempts) {
      const payload = await requestDart<DartFinancialResponse>("fnlttSinglAcnt.json", {
        corp_code: corp.corpCode,
        bsns_year: String(attempt.year),
        reprt_code: attempt.code,
      });

      if (payload.status === "000") {
        return {
          rows: payload.list ?? [],
          status: "ready" as const,
          message: `${attempt.year}년 ${attempt.label} 기준 실적 데이터를 조회했습니다.`,
        };
      }

      if (payload.status !== "013") {
        throw new Error(payload.message || "OpenDART 실적 조회에 실패했습니다.");
      }
      lastMessage = payload.message;
    }

    return {
      rows: [] as DartFinancialRow[],
      status: "data-unavailable" as const,
      message: lastMessage || "최근 사업/분기보고서 실적 데이터가 없습니다.",
    };
  } catch (error) {
    return {
      rows: [] as DartFinancialRow[],
      status: "data-unavailable" as const,
      message: error instanceof Error ? error.message : "OpenDART 실적 데이터를 불러오지 못했습니다.",
    };
  }
}
