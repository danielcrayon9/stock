import type {
  IntradayEntryTiming,
  IntradayRecommendationType,
  MinuteFlowCheck,
  MarketIndexCheck,
  OrderbookCheck,
  TodayNewsCheck,
  VolumePersistenceCheck,
} from "@/lib/intradayTypes";

type CheckList = Array<{ id: string; passed: boolean | null; label: string }>;

export type IntradayExclusionInput = {
  stockName: string;
  minuteFlowChecks?: MinuteFlowCheck[];
  volumePersistenceChecks?: VolumePersistenceCheck[];
  orderbookChecks?: OrderbookCheck[];
  marketIndexChecks?: MarketIndexCheck[];
  todayNewsChecks?: TodayNewsCheck[];
  todayNewsHighlights?: { title: string }[];
  volumePersistenceScore: number | null;
  stopLossPrice: number | null;
  riskRewardRatio: number | null;
};

export type IntradayExclusionResult = {
  forceExcluded: boolean;
  reasons: string[];
  riskPenalty: number;
};

function checkPassed(checks: CheckList | undefined, id: string): boolean {
  return checks?.find((item) => item.id === id)?.passed === true;
}

function newsText(input: IntradayExclusionInput): string {
  return (input.todayNewsHighlights ?? []).map((item) => item.title).join(" ");
}

export function evaluateIntradayExclusion(input: IntradayExclusionInput): IntradayExclusionResult {
  const reasons: string[] = [];
  let riskPenalty = 0;

  const text = `${input.stockName} ${newsText(input)}`;

  if (checkPassed(input.minuteFlowChecks, "vwap-break")) {
    reasons.push("분봉 VWAP 이탈");
  }
  if (
    (input.volumePersistenceScore ?? 0) < 0 ||
    checkPassed(input.volumePersistenceChecks, "tv-price-down") ||
    checkPassed(input.volumePersistenceChecks, "price-up-tv-down")
  ) {
    reasons.push("거래대금 지속성 약화");
  }
  if (checkPassed(input.volumePersistenceChecks, "spike-upper-wick")) {
    reasons.push("장대양봉 후 긴 윗꼬리·거래대금 폭증");
  }
  if (checkPassed(input.orderbookChecks, "lower-gap")) {
    reasons.push("하방 호가 공백 과다");
  }
  if (checkPassed(input.marketIndexChecks, "markets-crash")) {
    reasons.push("시장 지수 급락");
  }
  if (checkPassed(input.todayNewsChecks, "severe-risk")) {
    reasons.push("유상증자/CB/소송/규제 뉴스");
  }
  if (checkPassed(input.todayNewsChecks, "negative")) {
    riskPenalty += 5;
  }
  if (input.stopLossPrice == null) {
    reasons.push("손절가 산정 불가");
  }
  if (input.riskRewardRatio != null && input.riskRewardRatio < 2) {
    reasons.push("손익비 1:2 미만");
  }
  if (/관리종목|거래정지|투자경고|투자위험/.test(text)) {
    reasons.push("투자주의/관리/거래정지 관련");
  }
  if (/횡령|배임/.test(text)) {
    reasons.push("횡령/배임 관련");
  }
  if (/감사의견|한정|부적정/.test(text)) {
    reasons.push("감사의견 리스크");
  }

  return {
    forceExcluded: reasons.length > 0,
    reasons,
    riskPenalty,
  };
}

export function recommendationFromTotalScore(
  score: number | null,
  forceExcluded: boolean,
): IntradayRecommendationType {
  if (forceExcluded || score == null) return "제외";
  if (score >= 85) return "장중 강한 매수 후보";
  if (score >= 75) return "분할매수 후보";
  if (score >= 65) return "눌림목 대기 후보";
  if (score >= 50) return "관망";
  return "제외";
}

export function entryTimingFromAnalysis(
  totalScore: number | null,
  forceExcluded: boolean,
  minuteFlowChecks?: MinuteFlowCheck[],
): IntradayEntryTiming {
  if (forceExcluded) return "매수 부적합";
  if (totalScore == null || totalScore < 50) return "매수 부적합";
  if (totalScore >= 75 && checkPassed(minuteFlowChecks, "vwap-above")) return "즉시 관심";
  if (checkPassed(minuteFlowChecks, "breakout-hold")) return "돌파 확인";
  if (totalScore >= 65) return "눌림 대기";
  return "눌림 대기";
}

export const INTRADAY_TOP_PICK_LIMIT = 10;
export const INTRADAY_AI_POOL_LIMIT = 30;
