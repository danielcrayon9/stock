const STOCK_CODE_PATTERN = /^\d{6}$/;

export function parseSearchQuery(value: string | null) {
  const query = value?.trim() ?? "";
  if (!query) {
    return { ok: false as const, error: "검색어를 입력해 주세요." };
  }
  if (query.length < 2) {
    return { ok: false as const, error: "검색어는 2자 이상 입력해 주세요." };
  }
  return { ok: true as const, data: query };
}

export function parseStockCode(value: string | null) {
  const stockCode = value?.trim() ?? "";
  if (!STOCK_CODE_PATTERN.test(stockCode)) {
    return { ok: false as const, error: "6자리 종목코드가 필요합니다." };
  }
  return { ok: true as const, data: stockCode };
}

export function parseOhlcvPeriod(value: string | null) {
  const period = value?.trim() ?? "daily";
  if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
    return { ok: false as const, error: "period는 daily, weekly, monthly, yearly 중 하나여야 합니다." };
  }
  return { ok: true as const, data: period as "daily" | "weekly" | "monthly" | "yearly" };
}

const SCAN_TARGETS = ["KOSPI200", "KOSDAQ100", "KOSPI200_KOSDAQ100"] as const;
const RISK_PROFILE_VALUES = ["conservative", "neutral", "aggressive"] as const;

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

export function parseScanFilters(body: Record<string, unknown> | null | undefined) {
  const source = body ?? {};
  const target = SCAN_TARGETS.includes(source.target as (typeof SCAN_TARGETS)[number])
    ? (source.target as (typeof SCAN_TARGETS)[number])
    : "KOSPI200_KOSDAQ100";
  const riskProfile = RISK_PROFILE_VALUES.includes(source.riskProfile as (typeof RISK_PROFILE_VALUES)[number])
    ? (source.riskProfile as (typeof RISK_PROFILE_VALUES)[number])
    : "neutral";

  return {
    target,
    riskProfile,
    targetProfitRate: clampNumber(source.targetProfitRate, 20, 3, 100),
    minTradingValue: clampNumber(source.minTradingValue, 5_000_000_000, 0, 1_000_000_000_000),
    minMarketCap: clampNumber(source.minMarketCap, 0, 0, 100_000_000_000_000),
    forceRescan: Boolean(source.forceRescan),
    maxAiCandidates: clampNumber(source.maxAiCandidates, 30, 0, 60),
  };
}
