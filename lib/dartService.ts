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

const DART_BASE_URL = "https://opendart.fss.or.kr/api";

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
  const response = await fetch(`${DART_BASE_URL}/${path}?${query.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!response.ok) {
    throw new Error(`OpenDART API 응답 오류 (${response.status})`);
  }

  return (await response.json()) as T;
}

export async function getCorpInfo(stockCode: string) {
  const payload = await requestDart<DartCompanyResponse>("company.json", { stock_code: stockCode });
  if (payload.status !== "000" || !payload.corp_code) {
    throw new Error(payload.message || "OpenDART에서 기업 고유번호를 찾지 못했습니다.");
  }
  return {
    corpCode: payload.corp_code,
    stockName: payload.corp_name || stockCode,
    stockCode: payload.stock_code || stockCode,
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

export async function getFinancialStatements(stockCode: string, year = new Date().getFullYear() - 1) {
  if (!getDartApiKey()) {
    return {
      rows: [] as DartFinancialRow[],
      status: "disabled" as const,
      message: "OpenDART API 키가 설정되지 않았습니다.",
    };
  }

  try {
    const corp = await getCorpInfo(stockCode);
    const payload = await requestDart<DartFinancialResponse>("fnlttSinglAcnt.json", {
      corp_code: corp.corpCode,
      bsns_year: String(year),
      reprt_code: "11011",
    });

    if (payload.status === "013") {
      return {
        rows: [] as DartFinancialRow[],
        status: "data-unavailable" as const,
        message: `${year}년 사업보고서 실적 데이터가 없습니다.`,
      };
    }

    if (payload.status !== "000") {
      throw new Error(payload.message || "OpenDART 실적 조회에 실패했습니다.");
    }

    return {
      rows: payload.list ?? [],
      status: "ready" as const,
      message: `${year}년 사업보고서 기준 실적 데이터를 조회했습니다.`,
    };
  } catch (error) {
    return {
      rows: [] as DartFinancialRow[],
      status: "data-unavailable" as const,
      message: error instanceof Error ? error.message : "OpenDART 실적 데이터를 불러오지 못했습니다.",
    };
  }
}
