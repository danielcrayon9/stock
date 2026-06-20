import type { Market, ScanTarget } from "@/lib/types";

export type MinuteInterval = "1m" | "3m" | "5m" | "15m";

export type MinuteBar = {
  stockCode: string;
  interval: MinuteInterval;
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradingValue: number;
  vwap: number | null;
  ma20: number | null;
};

export type OrderbookLevel = {
  price: number;
  quantity: number;
};

export type IntradayOrderbook = {
  stockCode: string;
  bidLevels: OrderbookLevel[];
  askLevels: OrderbookLevel[];
  spreadRate: number | null;
  tradeStrength: number | null;
  capturedAt: string;
};

export type MarketIndexSnapshot = {
  indexCode: string;
  indexName: string;
  currentValue: number | null;
  changeRate: number | null;
  direction: "상승" | "중립" | "하락" | "데이터 부족";
  capturedAt: string;
};

export type IntradayRecommendationType =
  | "장중 강한 매수 후보"
  | "분할매수 후보"
  | "눌림목 대기 후보"
  | "관망"
  | "제외";

export type IntradayEntryTiming = "즉시 관심" | "눌림 대기" | "돌파 확인" | "매수 부적합";

export type IntradayCandidate = {
  id: string;
  rank: number;
  stockCode: string;
  stockName: string;
  market: Market;
  currentPrice: number | null;
  changeRate: number | null;
  tradingValue: number | null;
  minuteFlowScore: number | null;
  volumePersistenceScore: number | null;
  orderbookScore: number | null;
  todayNewsScore: number | null;
  marketIndexScore: number | null;
  technicalScore: number | null;
  dailyTrendScore: number | null;
  riskPenalty: number;
  intradayTotalScore: number | null;
  recommendationType: IntradayRecommendationType;
  entryTiming: IntradayEntryTiming;
  entryPriceRange: string;
  stopLossPrice: number | null;
  targetPrice1: number | null;
  targetPrice2: number | null;
  riskRewardRatio: number | null;
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
  updatedAt: string;
};

export type IntradayScanSnapshot = {
  id: string;
  target: ScanTarget;
  status: "ready" | "worker-not-configured" | "data-unavailable";
  source: "sample" | "realtime-worker" | "fallback";
  generatedAt: string;
  message: string;
  safetyMessage: string;
  marketIndexes: MarketIndexSnapshot[];
  candidates: IntradayCandidate[];
};
