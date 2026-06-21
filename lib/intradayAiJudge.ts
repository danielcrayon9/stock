import { READ_ONLY_DISCLAIMER } from "@/lib/safetyGuard";
import type { IntradayCandidate, IntradayEntryTiming, IntradayRecommendationType } from "@/lib/intradayTypes";

export type IntradayAiJudgeResult = {
  stockCode: string;
  stockName: string;
  intradayFinalOpinion: IntradayRecommendationType;
  confidence: number;
  entryTiming: IntradayEntryTiming;
  entryPriceRange: string;
  stopLossPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  riskRewardRatio: number;
  minuteFlowSummary: string;
  volumePersistenceSummary: string;
  orderbookSummary: string;
  marketIndexSummary: string;
  todayNewsSummary: string;
  positiveFactors: string[];
  negativeFactors: string[];
  riskManagement: string;
  summary: string;
  warningMessage: string;
};

export function fallbackIntradayAiJudge(candidate: IntradayCandidate): IntradayAiJudgeResult {
  return {
    stockCode: candidate.stockCode,
    stockName: candidate.stockName,
    intradayFinalOpinion: candidate.recommendationType,
    confidence: candidate.intradayTotalScore ?? 0,
    entryTiming: candidate.entryTiming,
    entryPriceRange: candidate.entryPriceRange,
    stopLossPrice: candidate.stopLossPrice ?? 0,
    targetPrice1: candidate.targetPrice1 ?? 0,
    targetPrice2: candidate.targetPrice2 ?? 0,
    riskRewardRatio: candidate.riskRewardRatio ?? 0,
    minuteFlowSummary: candidate.minuteFlowSummary,
    volumePersistenceSummary: candidate.volumePersistenceSummary,
    orderbookSummary: candidate.orderbookSummary,
    marketIndexSummary: candidate.marketIndexSummary,
    todayNewsSummary: candidate.todayNewsSummary,
    positiveFactors: candidate.positiveFactors,
    negativeFactors: candidate.negativeFactors,
    riskManagement: candidate.riskManagement,
    summary: candidate.summary,
    warningMessage: READ_ONLY_DISCLAIMER,
  };
}
