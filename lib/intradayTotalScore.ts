import {
  entryTimingFromAnalysis,
  evaluateIntradayExclusion,
  recommendationFromTotalScore,
  type IntradayExclusionInput,
} from "@/lib/intradayExclusion";
import type { IntradayCandidate, IntradayScanSnapshot } from "@/lib/intradayTypes";
import type { IntradayDailyContext } from "@/lib/intradayDailyContext";

export type IntradayScoreBreakdown = {
  technicalPart: number;
  dailyTrendPart: number;
  minuteFlowPart: number;
  volumePart: number;
  orderbookPart: number;
  newsPart: number;
  marketPart: number;
  riskPenalty: number;
  rawTotal: number;
  finalTotal: number;
};

export function calculateIntradayTotalScore(input: {
  technicalScore: number | null;
  dailyTrendScore: number | null;
  minuteFlowScore: number | null;
  volumePersistenceScore: number | null;
  orderbookScore: number | null;
  todayNewsScore: number | null;
  marketIndexScore: number | null;
  riskPenalty?: number;
}): IntradayScoreBreakdown {
  const technicalPart = (input.technicalScore ?? 0) * 0.15;
  const dailyTrendPart = (input.dailyTrendScore ?? 0) * 0.1;
  const minuteFlowPart = (input.minuteFlowScore ?? 0) * 0.2;
  const volumePart = (input.volumePersistenceScore ?? 0) * 0.2;
  const orderbookPart = (input.orderbookScore ?? 0) * 0.15;
  const newsPart = (input.todayNewsScore ?? 0) * 0.1;
  const marketPart = (input.marketIndexScore ?? 0) * 0.1;
  const riskPenalty = input.riskPenalty ?? 0;

  const rawTotal =
    technicalPart +
    dailyTrendPart +
    minuteFlowPart +
    volumePart +
    orderbookPart +
    newsPart +
    marketPart;

  const finalTotal = Math.max(0, Math.round((rawTotal - riskPenalty) * 10) / 10);

  return {
    technicalPart: Math.round(technicalPart * 10) / 10,
    dailyTrendPart: Math.round(dailyTrendPart * 10) / 10,
    minuteFlowPart: Math.round(minuteFlowPart * 10) / 10,
    volumePart: Math.round(volumePart * 10) / 10,
    orderbookPart: Math.round(orderbookPart * 10) / 10,
    newsPart: Math.round(newsPart * 10) / 10,
    marketPart: Math.round(marketPart * 10) / 10,
    riskPenalty,
    rawTotal: Math.round(rawTotal * 10) / 10,
    finalTotal,
  };
}

export function finalizeIntradayCandidate(
  candidate: IntradayCandidate,
  daily: IntradayDailyContext,
): IntradayCandidate {
  const exclusionInput: IntradayExclusionInput = {
    stockName: candidate.stockName,
    minuteFlowChecks: candidate.minuteFlowChecks,
    volumePersistenceChecks: candidate.volumePersistenceChecks,
    orderbookChecks: candidate.orderbookChecks,
    marketIndexChecks: candidate.marketIndexChecks,
    todayNewsChecks: candidate.todayNewsChecks,
    todayNewsHighlights: candidate.todayNewsHighlights,
    volumePersistenceScore: candidate.volumePersistenceScore,
    stopLossPrice: daily.stopLossPrice,
    riskRewardRatio: daily.riskRewardRatio,
  };

  const exclusion = evaluateIntradayExclusion(exclusionInput);
  const scoreBreakdown = calculateIntradayTotalScore({
    technicalScore: daily.technicalScore,
    dailyTrendScore: daily.dailyTrendScore,
    minuteFlowScore: candidate.minuteFlowScore,
    volumePersistenceScore: candidate.volumePersistenceScore,
    orderbookScore: candidate.orderbookScore,
    todayNewsScore: candidate.todayNewsScore,
    marketIndexScore: candidate.marketIndexScore,
    riskPenalty: exclusion.riskPenalty,
  });

  const intradayTotalScore = exclusion.forceExcluded
    ? 0
    : Math.max(0, scoreBreakdown.finalTotal);
  const recommendationType = recommendationFromTotalScore(intradayTotalScore, exclusion.forceExcluded);
  const entryTiming = entryTimingFromAnalysis(
    intradayTotalScore,
    exclusion.forceExcluded,
    candidate.minuteFlowChecks,
  );

  const negativeFactors = [...candidate.negativeFactors];
  if (exclusion.reasons.length > 0) {
    negativeFactors.push(...exclusion.reasons.filter((reason) => !negativeFactors.includes(reason)));
  }

  const scoreSummary = exclusion.forceExcluded
    ? `강제 제외 · ${exclusion.reasons.join(", ")}`
    : `종합 ${intradayTotalScore}점 (일봉 ${scoreBreakdown.technicalPart}+${scoreBreakdown.dailyTrendPart} · 장중 ${scoreBreakdown.minuteFlowPart}+${scoreBreakdown.volumePart}+${scoreBreakdown.orderbookPart}+${scoreBreakdown.newsPart}+${scoreBreakdown.marketPart})`;

  return {
    ...candidate,
    technicalScore: daily.technicalScore,
    dailyTrendScore: daily.dailyTrendScore,
    riskPenalty: exclusion.riskPenalty,
    intradayTotalScore,
    recommendationType,
    entryTiming,
    entryPriceRange: daily.entryPriceRange,
    stopLossPrice: daily.stopLossPrice,
    targetPrice1: daily.targetPrice1,
    targetPrice2: daily.targetPrice2,
    riskRewardRatio: daily.riskRewardRatio,
    forceExcluded: exclusion.forceExcluded,
    exclusionReasons: exclusion.reasons,
    scoreBreakdown,
    negativeFactors,
    summary: `${candidate.summary} · ${scoreSummary}`,
    riskManagement: exclusion.forceExcluded
      ? `제외 사유: ${exclusion.reasons.join(", ")}. 실제 주문은 실행되지 않습니다.`
      : candidate.riskManagement,
  };
}

export function extractTopIntradayCandidates(
  candidates: IntradayCandidate[],
  limit = 10,
): IntradayCandidate[] {
  return candidates
    .filter((item) => !item.forceExcluded && item.recommendationType !== "제외")
    .sort((a, b) => (b.intradayTotalScore ?? 0) - (a.intradayTotalScore ?? 0))
    .slice(0, limit)
    .map((item, index) => ({ ...item, topPickRank: index + 1 }));
}

export function applySnapshotRanking(snapshot: IntradayScanSnapshot): IntradayScanSnapshot {
  const sorted = [...snapshot.candidates].sort(
    (a, b) => (b.intradayTotalScore ?? 0) - (a.intradayTotalScore ?? 0),
  );

  const ranked = sorted.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
  const topCandidates = extractTopIntradayCandidates(ranked);
  const excludedCount = ranked.filter((item) => item.forceExcluded).length;

  return {
    ...snapshot,
    candidates: ranked,
    topCandidates,
    excludedCount,
    aiCandidatePool: ranked
      .filter((item) => !item.forceExcluded)
      .slice(0, 30),
  };
}
