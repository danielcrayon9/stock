import type { StockRuleAnalysis } from "@/lib/batchAnalyzer";
import type { AiRiskLevel, RecommendationType } from "@/lib/types";

export type EnrichmentData = {
  disclosureScore: number | null;
  newsScore: number | null;
  financialScore: number | null;
  hasNegativeDisclosure: boolean;
  negativeDisclosureReason: string | null;
};

export const EMPTY_ENRICHMENT: EnrichmentData = {
  disclosureScore: null,
  newsScore: null,
  financialScore: null,
  hasNegativeDisclosure: false,
  negativeDisclosureReason: null,
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * 사용 가능한 하위 점수에 가중치를 적용하고 리스크 점수를 차감해 종합 점수를 산출한다.
 */
export function computeTotalScore(
  analysis: StockRuleAnalysis,
  enrichment: EnrichmentData,
): number | null {
  const weighted: Array<{ value: number | null; weight: number }> = [
    { value: analysis.score.technicalScore, weight: 0.35 },
    { value: analysis.score.volumeScore, weight: 0.2 },
    { value: enrichment.financialScore, weight: 0.15 },
    { value: enrichment.disclosureScore, weight: 0.15 },
    { value: enrichment.newsScore, weight: 0.15 },
  ];

  let acc = 0;
  let weightSum = 0;
  for (const item of weighted) {
    if (item.value != null) {
      acc += item.value * item.weight;
      weightSum += item.weight;
    }
  }
  if (weightSum === 0) return null;

  let base = acc / weightSum;
  const riskScore = analysis.score.riskScore;
  if (riskScore != null) {
    base -= Math.max(0, riskScore - 50) * 0.5;
  }
  return clamp(base);
}

export function riskLevelFromScore(score: number | null): AiRiskLevel {
  if (score == null) return "주의";
  if (score >= 85) return "매우 높음";
  if (score >= 70) return "높음";
  if (score >= 50) return "주의";
  if (score >= 30) return "보통";
  return "낮음";
}

export function scoreGradeLabel(totalScore: number | null): string {
  if (totalScore == null) return "데이터 부족";
  if (totalScore >= 80) return "강한 관심";
  if (totalScore >= 65) return "관심";
  if (totalScore >= 50) return "관망";
  if (totalScore >= 35) return "주의";
  return "제외";
}

/**
 * 점수와 무관하게 제외/위험 처리해야 하는 하드 룰을 평가한다.
 * 관리종목/거래정지/감사의견 거절 등 KRX 플래그는 미연동이며,
 * 악재 공시(횡령·배임, 대규모 유증/CB, 상폐 등)는 공시 분석으로 대체 점검한다.
 */
export function evaluateHardExclusion(
  analysis: StockRuleAnalysis,
  enrichment: EnrichmentData,
  totalScore: number | null,
): string | null {
  if (analysis.status === "data-unavailable") return "데이터 부족";
  if (enrichment.hasNegativeDisclosure) {
    return enrichment.negativeDisclosureReason ?? "악재 공시";
  }
  if (analysis.entryPrice.stopLossPrice == null) return "손절가 산정 불가";
  if (analysis.entryPrice.riskRewardRatio == null || analysis.entryPrice.riskRewardRatio < 2) {
    return "손익비 1:2 미만";
  }
  if (analysis.score.riskScore != null && analysis.score.riskScore >= 80) return "리스크 과다";
  if (analysis.volume.isHighAreaDistributionRisk) return "고점 거래대금 폭발 후 장대음봉";
  if (totalScore != null && totalScore <= 34) return "종합 점수 미달";
  return null;
}

export function classifyRecommendation(
  analysis: StockRuleAnalysis,
  enrichment: EnrichmentData,
  totalScore: number | null,
  exclusionReason: string | null,
): RecommendationType {
  if (exclusionReason) return "제외 후보";

  const currentPrice = analysis.currentPrice;
  const { neutralBuyPrice, conservativeBuyPrice, riskRewardRatio } = analysis.entryPrice;
  const riskScore = analysis.score.riskScore ?? 50;
  const previousHigh = analysis.technical.previousHigh;
  const resistance = analysis.supportResistance.primaryResistance;
  const breakoutLevel = previousHigh ?? resistance;

  if (currentPrice == null || neutralBuyPrice == null) {
    return "눌림목 대기 후보";
  }

  // 돌파 관심: 전고점/저항선 돌파 직전 + 거래대금 증가
  if (
    breakoutLevel != null &&
    currentPrice >= breakoutLevel * 0.97 &&
    currentPrice <= breakoutLevel * 1.02 &&
    (analysis.volume.isSurging || (analysis.volume.tradingValueRatio20 ?? 0) >= 1.3)
  ) {
    return "돌파 관심 후보";
  }

  // 현재가가 매수가보다 충분히 높으면 추격매수 위험 → 눌림목 대기
  if (currentPrice > neutralBuyPrice * 1.03) {
    return "눌림목 대기 후보";
  }

  const inBuyZone =
    conservativeBuyPrice != null
      ? currentPrice <= neutralBuyPrice * 1.03 && currentPrice >= conservativeBuyPrice * 0.97
      : currentPrice <= neutralBuyPrice * 1.03;

  if (inBuyZone) {
    const strong =
      (totalScore ?? 0) >= 65 &&
      (riskRewardRatio ?? 0) >= 2 &&
      riskScore < 55 &&
      !enrichment.hasNegativeDisclosure;
    if (strong) return "즉시 관심 후보";
    return "분할매수 후보";
  }

  return "눌림목 대기 후보";
}

export function buildSummary(
  analysis: StockRuleAnalysis,
  totalScore: number | null,
  recommendationType: RecommendationType,
  exclusionReason: string | null,
): string {
  if (exclusionReason) {
    return `${recommendationType}: ${exclusionReason}`;
  }
  const grade = scoreGradeLabel(totalScore);
  const trend = analysis.technical.trend.trend;
  const rrr = analysis.entryPrice.riskRewardRatio;
  const rrrText = rrr != null ? `손익비 1:${rrr.toFixed(2)}` : "손익비 데이터 부족";
  return `${grade} · ${trend} 추세 · ${rrrText} · ${recommendationType}`;
}
