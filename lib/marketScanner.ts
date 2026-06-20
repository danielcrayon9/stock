import {
  MAX_AI_CANDIDATES,
} from "@/lib/constants";
import {
  analyzeUniverse,
  runFirstFilter,
  type StockRuleAnalysis,
} from "@/lib/batchAnalyzer";
import { judgeStockAnalysis } from "@/lib/aiJudge";
import { getDisclosures } from "@/lib/dartService";
import { getFinancialAnalysis } from "@/lib/financialAnalysis";
import { getNews } from "@/lib/newsService";
import { aggregateOhlcv } from "@/lib/ohlcv";
import { runDailyBacktest } from "@/lib/dailyBacktest";
import { analyzeTechnical } from "@/lib/technicalAnalysis";
import { projectTradeCosts } from "@/lib/tradingCost";
import {
  appendRow,
  appendRows,
  hasGoogleSheetsConfig,
} from "@/lib/googleSheets";
import {
  EMPTY_ENRICHMENT,
  buildSummary,
  classifyRecommendation,
  computeTotalScore,
  evaluateHardExclusion,
  riskLevelFromScore,
  type EnrichmentData,
} from "@/lib/recommendationEngine";
import { nowIso } from "@/lib/utils";
import type {
  AiJudgePayload,
  AiJudgeResult,
  RecommendedCandidate,
  ScanFilters,
  ScanResultRow,
  ScanRun,
  ScanRunResponse,
} from "@/lib/types";

// 비용/속도 제약: 공시·뉴스·실적 enrich는 룰 점수 상위 후보로 제한한다.
const ENRICH_CANDIDATES = 24;

type ScanProgress = {
  done: number;
  total: number;
  currentName: string;
};

type RunOptions = {
  onProgress?: (progress: ScanProgress) => void;
  persist?: boolean;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function run() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => run());
  await Promise.all(workers);
  return results;
}

async function enrichCandidate(analysis: StockRuleAnalysis): Promise<EnrichmentData> {
  const [disclosures, financials, news] = await Promise.allSettled([
    getDisclosures(analysis.stock.stockCode),
    getFinancialAnalysis(analysis.stock.stockCode),
    getNews(analysis.stock.stockName, analysis.stock.stockCode),
  ]);

  const disclosureResult = disclosures.status === "fulfilled" ? disclosures.value : null;
  const financialResult = financials.status === "fulfilled" ? financials.value : null;
  const newsResult = news.status === "fulfilled" ? news.value : null;

  const negativeDisclosure = (disclosureResult?.negativeCount ?? 0) > 0;

  return {
    disclosureScore: disclosureResult?.disclosureScore ?? null,
    newsScore: newsResult?.newsScore ?? null,
    financialScore: financialResult?.financialScore ?? null,
    hasNegativeDisclosure: negativeDisclosure,
    negativeDisclosureReason: negativeDisclosure ? "최근 악재 공시" : null,
  };
}

function buildAiPayload(analysis: StockRuleAnalysis, filters: ScanFilters): AiJudgePayload {
  const dailyPoints = analysis.technical.points;
  const weekly = analyzeTechnical(aggregateOhlcv(dailyPoints, "weekly"), "주봉");
  const monthly = analyzeTechnical(aggregateOhlcv(dailyPoints, "monthly"), "월봉");
  const yearly = analyzeTechnical(aggregateOhlcv(dailyPoints, "yearly"), "년봉");

  return {
    stock: analysis.stock,
    currentPrice: analysis.currentPrice,
    targetProfitRate: filters.targetProfitRate,
    dailyAnalysis: analysis.technical,
    periodAnalysis: {
      daily: analysis.technical.trend.summary,
      weekly: weekly.trend.summary,
      monthly: monthly.trend.summary,
      yearly: yearly.trend.summary,
    },
    score: analysis.score,
    supportResistance: analysis.supportResistance,
    entryPrice: analysis.entryPrice,
    disclosures: null,
    financials: null,
    news: null,
  };
}

function buildResultRow(
  scanRunId: string,
  analysis: StockRuleAnalysis,
  enrichment: EnrichmentData,
  ai: AiJudgeResult | null,
  targetProfitRate: number,
): ScanResultRow {
  const totalScore = computeTotalScore(analysis, enrichment);
  const exclusionReason = evaluateHardExclusion(analysis, enrichment, totalScore);
  const recommendationType = classifyRecommendation(analysis, enrichment, totalScore, exclusionReason);

  const entry = analysis.entryPrice;
  const finalOpinion = exclusionReason
    ? "제외"
    : ai?.finalOpinion ?? entry.finalOpinionBase;
  const riskLevel = ai?.riskLevel ?? riskLevelFromScore(analysis.score.riskScore);
  const neutralBuyPrice = ai?.neutralBuyPrice ?? entry.neutralBuyPrice;
  const stopLossPrice = ai?.stopLossPrice ?? entry.stopLossPrice;
  const targetPrice1 = ai?.targetPrice1 ?? entry.targetPrice1;
  const costProjection = projectTradeCosts({
    entryPrice: neutralBuyPrice,
    targetPrice: targetPrice1,
    stopLossPrice,
  });
  const backtest =
    analysis.status === "ok"
      ? runDailyBacktest({ points: analysis.technical.points, targetProfitRate })
      : null;

  return {
    id: crypto.randomUUID(),
    scanRunId,
    stockCode: analysis.stock.stockCode,
    stockName: analysis.stock.stockName,
    market: analysis.stock.market,
    currentPrice: analysis.currentPrice,
    changeRate: analysis.changeRate,
    tradingValue: analysis.tradingValue,
    marketCap: analysis.marketCap,
    technicalScore: analysis.score.technicalScore,
    volumeScore: analysis.score.volumeScore,
    financialScore: enrichment.financialScore,
    disclosureScore: enrichment.disclosureScore,
    newsScore: enrichment.newsScore,
    riskScore: analysis.score.riskScore,
    totalScore,
    conservativeBuyPrice: ai?.conservativeBuyPrice ?? entry.conservativeBuyPrice,
    neutralBuyPrice,
    aggressiveBuyPrice: ai?.aggressiveBuyPrice ?? entry.aggressiveBuyPrice,
    stopLossPrice,
    targetPrice1,
    targetPrice2: ai?.targetPrice2 ?? entry.targetPrice2,
    riskRewardRatio: ai?.riskRewardRatio ?? entry.riskRewardRatio,
    grossProfitRate: costProjection.grossProfitRate,
    grossLossRate: costProjection.grossLossRate,
    netProfitRate: costProjection.netProfitRate,
    netLossRate: costProjection.netLossRate,
    netRiskRewardRatio: costProjection.netRiskRewardRatio,
    breakEvenRate: costProjection.breakEvenRate,
    totalTradingCostRate: costProjection.totalRoundTripCostRate,
    costDescription: costProjection.costDescription,
    backtestTrades: backtest?.trades ?? null,
    backtestWinRate: backtest?.winRate ?? null,
    backtestAverageNetReturn: backtest?.averageNetReturn ?? null,
    backtestExpectancy: backtest?.expectancy ?? null,
    backtestMaxDrawdown: backtest?.maxDrawdown ?? null,
    backtestTargetHitRate: backtest?.targetHitRate ?? null,
    backtestStopHitRate: backtest?.stopHitRate ?? null,
    backtestAverageHoldingDays: backtest?.averageHoldingDays ?? null,
    backtestSummary: backtest?.summary ?? "백테스트 데이터 부족",
    finalOpinion,
    recommendationType,
    riskLevel,
    summary: ai?.summary?.trim() ? ai.summary : buildSummary(analysis, totalScore, recommendationType, exclusionReason),
    analyzedAt: nowIso(),
  };
}

function toRecommendations(scanRunId: string, results: ScanResultRow[]): RecommendedCandidate[] {
  const createdAt = nowIso();
  return results
    .filter((row) => row.recommendationType !== "제외 후보")
    .sort((left, right) => (right.totalScore ?? 0) - (left.totalScore ?? 0))
    .map((row, index) => ({
      id: crypto.randomUUID(),
      scanRunId,
      stockCode: row.stockCode,
      stockName: row.stockName,
      rank: index + 1,
      recommendationType: row.recommendationType,
      finalOpinion: row.finalOpinion,
      currentPrice: row.currentPrice,
      neutralBuyPrice: row.neutralBuyPrice,
      stopLossPrice: row.stopLossPrice,
      targetPrice1: row.targetPrice1,
      targetPrice2: row.targetPrice2,
      totalScore: row.totalScore,
      netProfitRate: row.netProfitRate,
      netLossRate: row.netLossRate,
      netRiskRewardRatio: row.netRiskRewardRatio,
      backtestTrades: row.backtestTrades,
      backtestWinRate: row.backtestWinRate,
      backtestAverageNetReturn: row.backtestAverageNetReturn,
      backtestMaxDrawdown: row.backtestMaxDrawdown,
      riskLevel: row.riskLevel,
      summary: row.summary,
      createdAt,
    }));
}

async function persistScan(
  run: ScanRun,
  results: ScanResultRow[],
  recommendations: RecommendedCandidate[],
) {
  if (!hasGoogleSheetsConfig()) return;
  try {
    await appendRow("scan_runs", { ...run });
    await appendRows("scan_results", results.map((row) => ({ ...row })));
    await appendRows("recommended_candidates", recommendations.map((row) => ({ ...row })));
  } catch {
    // 스캔 결과 표시는 시트 저장 실패와 무관하게 유지한다.
  }
}

export async function runMarketScan(filters: ScanFilters, options: RunOptions = {}): Promise<ScanRunResponse> {
  const { onProgress, persist = true } = options;
  const startedAt = nowIso();
  const scanRunId = crypto.randomUUID();

  // 1. 유니버스 구성 (lazy import로 순환 의존 방지)
  const { getUniverseConstituents } = await import("@/lib/universeService");
  const universe = await getUniverseConstituents(filters.target);
  const stocks = universe.constituents.map((c) => ({
    stockCode: c.stockCode,
    stockName: c.stockName,
    market: c.market,
  }));
  const marketCapMap = new Map(universe.constituents.map((c) => [c.stockCode, c.marketCap]));

  // 2. 룰 기반 배치 분석
  const analyses = await analyzeUniverse(stocks, filters.targetProfitRate, (done, total, current) => {
    onProgress?.({ done, total, currentName: current.stockName });
  });

  // 유니버스의 공식 시가총액(KRX)을 분석 결과에 주입한다.
  for (const analysis of analyses) {
    if (analysis.status === "ok" && analysis.marketCap == null) {
      analysis.marketCap = marketCapMap.get(analysis.stock.stockCode) ?? null;
    }
  }

  // 3. 1차 필터
  const passed = analyses.filter((analysis) => runFirstFilter(analysis, filters).passed);

  // 4. 룰 점수 상위 후보를 enrich 대상으로 선정
  const provisionallyScored = passed
    .map((analysis) => ({ analysis, score: computeTotalScore(analysis, EMPTY_ENRICHMENT) ?? 0 }))
    .sort((left, right) => right.score - left.score);

  const enrichTargets = provisionallyScored.slice(0, ENRICH_CANDIDATES).map((item) => item.analysis);
  const enrichments = await mapWithConcurrency(enrichTargets, 4, (analysis) => enrichCandidate(analysis));
  const enrichmentMap = new Map<string, EnrichmentData>();
  enrichTargets.forEach((analysis, index) => {
    enrichmentMap.set(analysis.stock.stockCode, enrichments[index]);
  });

  // 5. enrich 반영 후 종합 점수로 재정렬, 상위만 AI 판단
  const maxAi = Math.max(0, Math.min(filters.maxAiCandidates ?? MAX_AI_CANDIDATES, enrichTargets.length));
  const aiRanked = enrichTargets
    .map((analysis) => ({
      analysis,
      score: computeTotalScore(analysis, enrichmentMap.get(analysis.stock.stockCode) ?? EMPTY_ENRICHMENT) ?? 0,
    }))
    .filter((item) => {
      const enrichment = enrichmentMap.get(item.analysis.stock.stockCode) ?? EMPTY_ENRICHMENT;
      return evaluateHardExclusion(item.analysis, enrichment, item.score) == null;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, maxAi)
    .map((item) => item.analysis);

  const aiResults = await mapWithConcurrency(aiRanked, 3, async (analysis) => {
    try {
      return await judgeStockAnalysis(buildAiPayload(analysis, filters));
    } catch {
      return null;
    }
  });
  const aiMap = new Map<string, AiJudgeResult>();
  aiRanked.forEach((analysis, index) => {
    const result = aiResults[index];
    if (result) aiMap.set(analysis.stock.stockCode, result);
  });

  // 6. 결과 행 빌드
  const results = passed.map((analysis) =>
    buildResultRow(
      scanRunId,
      analysis,
      enrichmentMap.get(analysis.stock.stockCode) ?? EMPTY_ENRICHMENT,
      aiMap.get(analysis.stock.stockCode) ?? null,
      filters.targetProfitRate,
    ),
  );
  results.sort((left, right) => (right.totalScore ?? 0) - (left.totalScore ?? 0));

  const recommendations = toRecommendations(scanRunId, results);

  const run: ScanRun = {
    id: scanRunId,
    universeType: filters.target,
    targetProfitRate: filters.targetProfitRate,
    minMarketCap: filters.minMarketCap,
    minTradingValue: filters.minTradingValue,
    riskProfile: filters.riskProfile,
    totalScanned: analyses.length,
    totalPassed: passed.length,
    totalRecommended: recommendations.length,
    startedAt,
    finishedAt: nowIso(),
    status: "completed",
    errorMessage: "",
  };

  if (persist) {
    await persistScan(run, results, recommendations);
  }

  return {
    run,
    results,
    recommendations,
    cached: false,
    message: `${universe.message} 총 ${analyses.length}종목 중 ${passed.length}종목이 1차 필터를 통과했고, ${recommendations.length}종목을 추천 후보로 분류했습니다.`,
  };
}
