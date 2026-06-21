import { getIntradayDailyContext } from "@/lib/intradayDailyContext";
import { getMinuteBarsForAnalysis } from "@/lib/minuteBarService";
import { analyzeMinuteFlow } from "@/lib/minuteFlowAnalysis";
import { analyzeMarketIndexForCandidate } from "@/lib/marketIndexAnalysis";
import { getMarketIndexContext } from "@/lib/marketIndexService";
import { getOrderbookForAnalysis } from "@/lib/orderbookService";
import { analyzeOrderbookGap } from "@/lib/orderbookAnalysis";
import { applySnapshotRanking, finalizeIntradayCandidate } from "@/lib/intradayTotalScore";
import { READ_ONLY_DISCLAIMER } from "@/lib/safetyGuard";
import type { MarketIndexContext } from "@/lib/sampleMarketIndexes";
import { getWorkerIntradaySnapshot } from "@/lib/realtimeClient";
import type { IntradayCandidate, IntradayScanSnapshot } from "@/lib/intradayTypes";
import { analyzeVolumePersistence } from "@/lib/volumePersistence";
import { getVolumePersistenceContext } from "@/lib/volumePersistenceContext";
import { analyzeTodayNews } from "@/lib/todayNewsAnalysis";
import { getTodayNewsForAnalysis } from "@/lib/todayNewsService";
import type { ScanTarget } from "@/lib/types";

const INTRADAY_ANALYSIS_LIMIT = 12;
const DEFAULT_TARGET_PROFIT_RATE = 10;

function estimateChangeRate(
  candidate: IntradayCandidate,
  bars: { open: number; close: number }[],
): number | null {
  if (candidate.changeRate != null) return candidate.changeRate;
  const first = bars[0];
  const last = bars.at(-1);
  if (!first || !last || first.open <= 0) return null;
  return ((last.close - first.open) / first.open) * 100;
}

function createSampleCandidate(index: number, overrides: Partial<IntradayCandidate>): IntradayCandidate {
  const now = new Date().toISOString();
  return {
    id: `intraday-sample-${index}`,
    rank: index,
    stockCode: "",
    stockName: "",
    market: "KOSPI",
    currentPrice: null,
    changeRate: null,
    tradingValue: null,
    minuteFlowScore: null,
    volumePersistenceScore: null,
    orderbookScore: null,
    todayNewsScore: null,
    marketIndexScore: null,
    technicalScore: null,
    dailyTrendScore: null,
    riskPenalty: 0,
    intradayTotalScore: null,
    recommendationType: "관망",
    entryTiming: "눌림 대기",
    entryPriceRange: "종합 점수 산출 후 표시",
    stopLossPrice: null,
    targetPrice1: null,
    targetPrice2: null,
    riskRewardRatio: null,
    minuteFlowSummary: "5분봉 VWAP, 20MA, 고점/저점 상승 여부를 분석합니다.",
    volumePersistenceSummary: "전일 동시간 대비·15/30분 거래대금 추세를 분석합니다.",
    orderbookSummary: "5/10호가 잔량, 상·하방 공백, 매도벽·스프레드·체결강도를 분석합니다.",
    marketIndexSummary: "KOSPI/KOSDAQ/업종 지수·breadth 방향을 분석합니다.",
    todayNewsSummary: "발행 시간·공시 교차 확인 기반 당일 뉴스 점수를 분석합니다.",
    positiveFactors: [],
    negativeFactors: [],
    riskManagement: "실제 주문은 실행되지 않으며, 관심 후보 검토용으로만 사용합니다.",
    summary: "장중 분석 준비 상태입니다.",
    warningMessage: READ_ONLY_DISCLAIMER,
    updatedAt: now,
    ...overrides,
  };
}

export function createFallbackIntradaySnapshot(target: ScanTarget = "KOSPI200_KOSDAQ100"): IntradayScanSnapshot {
  const now = new Date().toISOString();
  const candidates = [
    createSampleCandidate(1, {
      stockCode: "005930",
      stockName: "삼성전자",
      market: "KOSPI",
      summary: "worker 미연결 시 샘플 데이터로 장중 점수를 계산합니다.",
    }),
    createSampleCandidate(2, {
      stockCode: "035720",
      stockName: "카카오",
      market: "KOSPI",
      summary: "샘플 데이터 기반 장중 분석 참고용입니다.",
    }),
    createSampleCandidate(3, {
      stockCode: "247540",
      stockName: "에코프로비엠",
      market: "KOSDAQ",
      summary: "샘플 지수·분봉 패턴으로 장중 점수를 표시합니다.",
    }),
  ];

  return {
    id: `intraday-fallback-${now}`,
    target,
    status: "worker-not-configured",
    source: "fallback",
    generatedAt: now,
    message: "REALTIME_WORKER_URL 미설정 — 샘플 데이터로 2~7단계 분석을 계산합니다.",
    safetyMessage: "read-only 조회 전용 모드입니다. 실제 주문은 실행되지 않습니다.",
    marketIndexes: [],
    candidates,
  };
}

async function enrichCandidateWithIntradayAnalysis(
  candidate: IntradayCandidate,
  marketContext: MarketIndexContext,
): Promise<IntradayCandidate> {
  if (!candidate.stockCode) return candidate;

  const { bars, source, message } = await getMinuteBarsForAnalysis(candidate.stockCode, "5m");
  const flow = analyzeMinuteFlow(bars);
  const volumeContext = await getVolumePersistenceContext(candidate.stockCode, bars);
  const volume = analyzeVolumePersistence(bars, volumeContext);
  const latestBar = bars.at(-1);
  const currentPrice = candidate.currentPrice ?? latestBar?.close ?? null;
  const changeRate = estimateChangeRate(candidate, bars);
  const tradingValue = candidate.tradingValue ?? volumeContext.currentSessionTradingValue;

  const { book, source: orderbookSource, message: orderbookMessage } = await getOrderbookForAnalysis(
    candidate.stockCode,
    currentPrice,
  );
  const orderbook = analyzeOrderbookGap(book, {
    recent5MinTradingValue: latestBar?.tradingValue ?? volumeContext.recent5MinTradingValue,
  });

  const marketIndex = analyzeMarketIndexForCandidate(marketContext, {
    stockCode: candidate.stockCode,
    market: candidate.market,
    changeRate,
    tradingValue,
  });

  const newsFetch = await getTodayNewsForAnalysis(candidate.stockCode, candidate.stockName);
  const todayNews = analyzeTodayNews(newsFetch.items, newsFetch.disclosuresToday, {
    recent5MinTradingValue: latestBar?.tradingValue ?? volumeContext.recent5MinTradingValue,
    tradingValueSpike: (volume.sameTimeRatio ?? 0) >= 2,
  });

  const daily = await getIntradayDailyContext(
    {
      stockCode: candidate.stockCode,
      stockName: candidate.stockName,
      market: candidate.market,
    },
    DEFAULT_TARGET_PROFIT_RATE,
  );

  const positiveFactors = [
    ...flow.checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label),
    ...volume.checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label),
    ...orderbook.checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label),
    ...marketIndex.checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label),
    ...todayNews.checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label),
  ];
  const negativeFactors = [
    ...flow.checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label),
    ...volume.checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label),
    ...orderbook.checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label),
    ...marketIndex.checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label),
    ...todayNews.checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label),
  ];

  const summaryParts = [flow.summary, volume.summary, orderbook.summary, marketIndex.summary, todayNews.summary];
  const sampleNote =
    source === "sample" || orderbookSource === "sample" || newsFetch.source === "sample"
      ? ` (${message})`
      : "";

  const base: IntradayCandidate = {
    ...candidate,
    currentPrice,
    changeRate,
    tradingValue,
    minuteFlowScore: flow.score,
    minuteFlowSummary: flow.summary,
    minuteFlowChecks: flow.checks,
    minuteFlowSignals: flow.signals,
    volumePersistenceScore: volume.score,
    volumePersistenceSummary: volume.summary,
    volumePersistenceChecks: volume.checks,
    volumePersistenceSignals: volume.signals,
    sameTimeTradingValueRatio: volume.sameTimeRatio,
    orderbookScore: orderbook.score,
    orderbookSummary: orderbook.summary,
    orderbookChecks: orderbook.checks,
    orderbookSignals: orderbook.signals,
    orderbookMetrics: orderbook.metrics
      ? {
          ask5Qty: orderbook.metrics.ask5Qty,
          bid5Qty: orderbook.metrics.bid5Qty,
          ask10Qty: orderbook.metrics.ask10Qty,
          bid10Qty: orderbook.metrics.bid10Qty,
          spreadRate: orderbook.metrics.spreadRate,
          tradeStrength: orderbook.metrics.tradeStrength,
        }
      : undefined,
    marketIndexScore: marketIndex.score,
    marketIndexSummary: marketIndex.summary,
    marketIndexChecks: marketIndex.checks,
    marketIndexSignals: marketIndex.signals,
    sectorIndexCode: marketIndex.sectorIndexCode,
    todayNewsScore: todayNews.score,
    todayNewsSummary: todayNews.summary,
    todayNewsChecks: todayNews.checks,
    todayNewsSignals: todayNews.signals,
    todayNewsHighlights: todayNews.highlights,
    positiveFactors,
    negativeFactors,
    summary: `${summaryParts.join(" · ")}${sampleNote}${newsFetch.source === "sample" ? ` · ${newsFetch.message}` : ""}${orderbookSource === "sample" ? ` · ${orderbookMessage}` : ""}`,
    updatedAt: new Date().toISOString(),
  };

  return finalizeIntradayCandidate(base, daily);
}

export async function enrichSnapshotWithIntradayAnalysis(snapshot: IntradayScanSnapshot): Promise<IntradayScanSnapshot> {
  const marketContext = await getMarketIndexContext();
  const targets = snapshot.candidates.filter((item) => item.stockCode).slice(0, INTRADAY_ANALYSIS_LIMIT);
  const enriched = await Promise.all(
    targets.map((candidate) => enrichCandidateWithIntradayAnalysis(candidate, marketContext)),
  );

  const remaining = snapshot.candidates.slice(INTRADAY_ANALYSIS_LIMIT);

  const merged = applySnapshotRanking({
    ...snapshot,
    marketIndexes: marketContext.indexes,
    marketBreadth: marketContext.breadth,
    marketTradingValueChangeRate: marketContext.marketTradingValueChangeRate,
    candidates: [...enriched, ...remaining],
    message: "7단계: 종합 점수·강제 제외·상위 후보 추출을 완료했습니다.",
  });

  return merged;
}

/** @deprecated enrichSnapshotWithIntradayAnalysis 사용 */
export async function enrichSnapshotWithMinuteFlow(snapshot: IntradayScanSnapshot) {
  return enrichSnapshotWithIntradayAnalysis(snapshot);
}

export async function getIntradaySnapshot(target: ScanTarget = "KOSPI200_KOSDAQ100") {
  const workerSnapshot = await getWorkerIntradaySnapshot().catch(() => null);
  const base = workerSnapshot ?? createFallbackIntradaySnapshot(target);
  return enrichSnapshotWithIntradayAnalysis(base);
}

export async function runIntradayMinuteFlowScan(target: ScanTarget = "KOSPI200_KOSDAQ100") {
  return getIntradaySnapshot(target);
}
