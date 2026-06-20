import { SCAN_BATCH_SIZE } from "@/lib/constants";
import { calculateEntryPrices } from "@/lib/entryPriceEngine";
import { scoreAnalysis } from "@/lib/scoringEngine";
import { getDailyOhlcv } from "@/lib/stockData";
import { analyzeTechnical } from "@/lib/technicalAnalysis";
import { analyzeVolume } from "@/lib/volumeAnalysis";
import { findSupportResistance } from "@/lib/supportResistance";
import type {
  EntryPriceResult,
  ScanFilters,
  ScoreResult,
  Stock,
  SupportResistanceResult,
  TechnicalAnalysisResult,
  VolumeAnalysisResult,
} from "@/lib/types";

export type StockRuleAnalysis = {
  stock: Stock;
  status: "ok" | "data-unavailable";
  currentPrice: number | null;
  changeRate: number | null;
  tradingValue: number | null;
  marketCap: number | null;
  technical: TechnicalAnalysisResult;
  volume: VolumeAnalysisResult;
  supportResistance: SupportResistanceResult;
  score: ScoreResult;
  entryPrice: EntryPriceResult;
};

export type FirstFilterResult = {
  passed: boolean;
  reason: string | null;
};

function emptyTechnical(): TechnicalAnalysisResult {
  return {
    points: [],
    latest: null,
    trend: { label: "현재 봉", trend: "데이터 부족", summary: "데이터 부족" },
    high52Week: null,
    low52Week: null,
    previousHigh: null,
    previousLow: null,
    signals: ["데이터 부족"],
    message: "데이터 부족",
  };
}

function emptyVolume(): VolumeAnalysisResult {
  return {
    average5: null,
    average20: null,
    average60: null,
    currentTradingValue: null,
    tradingValueRatio20: null,
    isSurging: false,
    isDrying: false,
    isHighAreaDistributionRisk: false,
    summary: "데이터 부족",
  };
}

function emptySupportResistance(): SupportResistanceResult {
  return {
    supportLevels: [],
    resistanceLevels: [],
    primarySupport: null,
    primaryResistance: null,
    summary: "데이터 부족",
  };
}

function emptyEntryPrice(): EntryPriceResult {
  return {
    conservativeBuyPrice: null,
    neutralBuyPrice: null,
    aggressiveBuyPrice: null,
    stopLossPrice: null,
    targetPrice1: null,
    targetPrice2: null,
    riskRewardRatio: null,
    entrySuitability: "데이터 부족",
    finalOpinionBase: "매수금지",
    scenarios: [],
    reasoning: ["데이터 부족"],
    warningMessage: "데이터 부족: 매수가를 산출할 수 없습니다.",
  };
}

function dataUnavailable(stock: Stock): StockRuleAnalysis {
  return {
    stock,
    status: "data-unavailable",
    currentPrice: null,
    changeRate: null,
    tradingValue: null,
    marketCap: null,
    technical: emptyTechnical(),
    volume: emptyVolume(),
    supportResistance: emptySupportResistance(),
    score: { technicalScore: null, volumeScore: null, riskScore: null, reasons: ["데이터 부족"] },
    entryPrice: emptyEntryPrice(),
  };
}

export async function analyzeStockRules(stock: Stock, targetProfitRate: number): Promise<StockRuleAnalysis> {
  let ohlcv;
  try {
    ohlcv = await getDailyOhlcv(stock.stockCode, stock.market);
  } catch {
    return dataUnavailable(stock);
  }

  const points = ohlcv.points;
  if (points.length < 20) {
    return dataUnavailable(stock);
  }

  const technical = analyzeTechnical(points, "일봉");
  const volume = analyzeVolume(points);
  const supportResistance = findSupportResistance(points);
  const score = scoreAnalysis(technical, volume, supportResistance);
  const entryPrice = calculateEntryPrices({ technical, supportResistance, volume, score, targetProfitRate });

  const latest = points.at(-1)!;
  const previous = points.at(-2);
  const changeRate =
    previous && previous.close > 0 ? ((latest.close - previous.close) / previous.close) * 100 : null;

  return {
    stock,
    status: "ok",
    currentPrice: latest.close,
    changeRate: changeRate != null ? Math.round(changeRate * 100) / 100 : null,
    tradingValue: latest.tradingValue,
    marketCap: null, // 상장주식수 데이터 미연동: 시가총액은 데이터 부족
    technical,
    volume,
    supportResistance,
    score,
    entryPrice,
  };
}

/**
 * 1차 필터: 데이터 부족, 최소 거래대금, 최소 시가총액(가능한 경우)을 점검한다.
 * 관리종목/거래정지/투자위험 플래그는 KRX 데이터 연동 시 확장한다.
 */
export function runFirstFilter(analysis: StockRuleAnalysis, filters: ScanFilters): FirstFilterResult {
  if (analysis.status === "data-unavailable") {
    return { passed: false, reason: "데이터 부족" };
  }
  if (analysis.tradingValue == null) {
    return { passed: false, reason: "거래대금 데이터 부족" };
  }
  if (filters.minTradingValue > 0 && analysis.tradingValue < filters.minTradingValue) {
    return { passed: false, reason: "최소 거래대금 미달" };
  }
  // 시가총액은 데이터가 있을 때만 필터링한다.
  if (filters.minMarketCap > 0 && analysis.marketCap != null && analysis.marketCap < filters.minMarketCap) {
    return { passed: false, reason: "최소 시가총액 미달" };
  }
  return { passed: true, reason: null };
}

/**
 * 동시 호출 수를 제한하며 배치로 룰 기반 분석을 수행한다.
 */
export async function analyzeUniverse(
  stocks: Stock[],
  targetProfitRate: number,
  onProgress?: (done: number, total: number, current: Stock) => void,
): Promise<StockRuleAnalysis[]> {
  const results: StockRuleAnalysis[] = [];
  let done = 0;

  for (let i = 0; i < stocks.length; i += SCAN_BATCH_SIZE) {
    const batch = stocks.slice(i, i + SCAN_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (stock) => {
        const result = await analyzeStockRules(stock, targetProfitRate);
        done += 1;
        onProgress?.(done, stocks.length, stock);
        return result;
      }),
    );
    results.push(...batchResults);
  }

  return results;
}
