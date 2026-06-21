import { analyzeStockRules } from "@/lib/batchAnalyzer";
import type { Stock } from "@/lib/types";
import type { TechnicalAnalysisResult } from "@/lib/types";

export type IntradayDailyContext = {
  technicalScore: number | null;
  dailyTrendScore: number | null;
  stopLossPrice: number | null;
  targetPrice1: number | null;
  targetPrice2: number | null;
  riskRewardRatio: number | null;
  entryPriceRange: string;
  entrySuitability: string;
  trendSummary: string;
  status: "ok" | "data-unavailable";
};

export function computeDailyTrendScore(technical: TechnicalAnalysisResult): number | null {
  const trend = technical.trend.trend;
  if (trend.includes("상승")) return 78;
  if (trend.includes("횡보") || trend.includes("중립")) return 55;
  if (trend.includes("하락")) return 28;
  return null;
}

function formatEntryRange(conservative: number | null, aggressive: number | null): string {
  if (conservative != null && aggressive != null) {
    return `${conservative.toLocaleString()} ~ ${aggressive.toLocaleString()}원`;
  }
  if (conservative != null) return `${conservative.toLocaleString()}원 부근`;
  if (aggressive != null) return `${aggressive.toLocaleString()}원 부근`;
  return "일봉 데이터 부족";
}

export async function getIntradayDailyContext(
  stock: Stock,
  targetProfitRate = 10,
): Promise<IntradayDailyContext> {
  const analysis = await analyzeStockRules(stock, targetProfitRate);

  if (analysis.status === "data-unavailable") {
    return {
      technicalScore: null,
      dailyTrendScore: null,
      stopLossPrice: null,
      targetPrice1: null,
      targetPrice2: null,
      riskRewardRatio: null,
      entryPriceRange: "일봉 데이터 부족",
      entrySuitability: "데이터 부족",
      trendSummary: analysis.technical.trend.summary,
      status: "data-unavailable",
    };
  }

  const entry = analysis.entryPrice;
  return {
    technicalScore: analysis.score.technicalScore,
    dailyTrendScore: computeDailyTrendScore(analysis.technical),
    stopLossPrice: entry.stopLossPrice,
    targetPrice1: entry.targetPrice1,
    targetPrice2: entry.targetPrice2,
    riskRewardRatio: entry.riskRewardRatio,
    entryPriceRange: formatEntryRange(entry.conservativeBuyPrice, entry.aggressiveBuyPrice),
    entrySuitability: entry.entrySuitability,
    trendSummary: analysis.technical.trend.summary,
    status: "ok",
  };
}
