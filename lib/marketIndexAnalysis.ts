import type { Market } from "@/lib/types";
import type { MarketIndexCheck } from "@/lib/intradayTypes";
import type { MarketIndexContext } from "@/lib/sampleMarketIndexes";
import { findIndex, resolveSectorIndexCode } from "@/lib/sampleMarketIndexes";

export type MarketIndexCandidateInput = {
  stockCode: string;
  market: Market;
  changeRate: number | null;
  tradingValue: number | null;
  sectorIndexCode?: string | null;
};

export type MarketIndexAnalysisResult = {
  score: number | null;
  summary: string;
  signals: string[];
  checks: MarketIndexCheck[];
  sectorIndexCode: string | null;
};

function buildCheck(
  id: string,
  label: string,
  passed: boolean | null,
  scoreDelta: number,
  detail: string,
): MarketIndexCheck {
  return { id, label, passed, scoreDelta, detail };
}

function isRising(snapshot: { changeRate: number | null } | null): boolean {
  return snapshot != null && (snapshot.changeRate ?? 0) > 0.05;
}

function isSharpDrop(changeRate: number | null): boolean {
  return changeRate != null && changeRate <= -1.0;
}

export function analyzeMarketIndexForCandidate(
  context: MarketIndexContext,
  candidate: MarketIndexCandidateInput,
): MarketIndexAnalysisResult {
  if (context.indexes.length === 0) {
    return {
      score: null,
      summary: "시장 지수 데이터 부족",
      signals: ["지수 worker 연결 필요"],
      checks: [],
      sectorIndexCode: null,
    };
  }

  const kospi = findIndex(context, "KOSPI");
  const kosdaq = findIndex(context, "KOSDAQ");
  const marketIndexCode = candidate.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI";
  const stockMarketIndex = findIndex(context, marketIndexCode);
  const sectorIndexCode =
    candidate.sectorIndexCode ?? resolveSectorIndexCode(candidate.stockCode, candidate.market);
  const sectorIndex = findIndex(context, sectorIndexCode);

  const bothMarketsRising = isRising(kospi) && isRising(kosdaq);
  const stockMarketRising = isRising(stockMarketIndex);
  const sectorRising = isRising(sectorIndex);

  const breadth = context.breadth;
  const breadthPositive =
    breadth != null && breadth.risingStockCount > breadth.fallingStockCount;

  const marketAvgChange =
    [kospi?.changeRate, kosdaq?.changeRate].filter((v): v is number => v != null).length > 0
      ? ([kospi?.changeRate, kosdaq?.changeRate].filter((v): v is number => v != null).reduce((a, b) => a + b, 0) /
          [kospi?.changeRate, kosdaq?.changeRate].filter((v): v is number => v != null).length)
      : null;

  const stockChange = candidate.changeRate ?? 0;
  const stockTv = candidate.tradingValue ?? 0;
  const indexWeakStockStrong =
    marketAvgChange != null &&
    marketAvgChange < 0.1 &&
    stockChange > 0.4 &&
    stockTv > 0;

  const kospiSharpDrop = isSharpDrop(kospi?.changeRate ?? null);
  const kosdaqSharpDrop = isSharpDrop(kosdaq?.changeRate ?? null);
  const marketsSharpDrop = kospiSharpDrop && kosdaqSharpDrop;

  const sectorDecline = sectorIndex != null && (sectorIndex.changeRate ?? 0) < -0.8;

  const marketTvDecrease =
    context.marketTradingValueChangeRate != null && context.marketTradingValueChangeRate < -5;

  const checks: MarketIndexCheck[] = [
    buildCheck(
      "both-rising",
      "KOSPI/KOSDAQ 동반 상승",
      kospi != null && kosdaq != null ? bothMarketsRising : null,
      bothMarketsRising ? 10 : 0,
      bothMarketsRising
        ? `KOSPI ${kospi!.changeRate!.toFixed(2)}% · KOSDAQ ${kosdaq!.changeRate!.toFixed(2)}%`
        : "동반 상승 미확인",
    ),
    buildCheck(
      "market-rising",
      `${marketIndexCode} 상승`,
      stockMarketIndex != null ? stockMarketRising : null,
      stockMarketRising ? 10 : 0,
      stockMarketRising
        ? `${marketIndexCode} ${stockMarketIndex!.changeRate!.toFixed(2)}%`
        : `${marketIndexCode} 상승 미확인`,
    ),
    buildCheck(
      "sector-rising",
      "업종 지수 상승",
      sectorIndex != null ? sectorRising : null,
      sectorRising ? 10 : 0,
      sectorRising
        ? `${sectorIndex!.indexName} ${sectorIndex!.changeRate!.toFixed(2)}%`
        : sectorIndex
          ? `${sectorIndex.indexName} 상승 미확인`
          : "업종 지수 없음",
    ),
    buildCheck(
      "breadth",
      "상승 종목 > 하락 종목",
      breadth != null ? breadthPositive : null,
      breadthPositive ? 5 : 0,
      breadth
        ? `상승 ${breadth.risingStockCount} / 하락 ${breadth.fallingStockCount}`
        : "breadth 데이터 없음",
    ),
    buildCheck(
      "stock-vs-index",
      "지수 약세·종목 거래대금 동반 상승",
      marketAvgChange != null ? indexWeakStockStrong : null,
      indexWeakStockStrong ? 5 : 0,
      indexWeakStockStrong
        ? `지수 ${marketAvgChange!.toFixed(2)}% · 종목 ${stockChange.toFixed(2)}%`
        : "동반 강세 미확인",
    ),
    buildCheck(
      "markets-crash",
      "KOSPI/KOSDAQ 급락",
      kospi != null && kosdaq != null ? marketsSharpDrop : null,
      marketsSharpDrop ? -20 : 0,
      marketsSharpDrop ? "양 지수 -1% 이상 하락" : "급락 없음",
    ),
    buildCheck(
      "sector-decline",
      "업종 지수 하락",
      sectorIndex != null ? sectorDecline : null,
      sectorDecline ? -15 : 0,
      sectorDecline
        ? `${sectorIndex!.indexName} ${sectorIndex!.changeRate!.toFixed(2)}%`
        : "업종 하락 없음",
    ),
    buildCheck(
      "market-tv-down",
      "시장 거래대금 감소",
      context.marketTradingValueChangeRate != null ? marketTvDecrease : null,
      marketTvDecrease ? -5 : 0,
      context.marketTradingValueChangeRate != null
        ? `전일 대비 ${context.marketTradingValueChangeRate.toFixed(1)}%`
        : "시장 거래대금 데이터 없음",
    ),
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.scoreDelta : 0), 0);
  const positives = checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label);
  const negatives = checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label);

  const signals = [
    ...positives.map((label) => `${label} ✓`),
    ...negatives.map((label) => `${label} ⚠`),
    ...context.indexes.map((item) => `${item.indexName}: ${item.direction}`),
  ];

  return {
    score,
    summary: `시장 지수 ${score}점 · ${positives.length}개 긍정 · ${negatives.length}개 경고`,
    signals,
    checks,
    sectorIndexCode: sectorIndex?.indexCode ?? sectorIndexCode,
  };
}

/** 스냅샷 전체 시장 방향 (종목 무관) */
export function analyzeMarketIndexes(context: MarketIndexContext): MarketIndexAnalysisResult {
  return analyzeMarketIndexForCandidate(context, {
    stockCode: "000000",
    market: "KOSPI",
    changeRate: null,
    tradingValue: null,
    sectorIndexCode: "KOSPI200",
  });
}
