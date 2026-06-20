export type Market = "KOSPI" | "KOSDAQ" | "KONEX" | "UNKNOWN";

export type Stock = {
  stockCode: string;
  stockName: string;
  market: Market;
};

export type WatchlistItem = Stock & {
  id: string;
  targetProfitRate: number;
  memo: string;
  lastAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type PortfolioItem = Stock & {
  id: string;
  buyDate: string;
  avgBuyPrice: number;
  quantity: number;
  investedAmount: number;
  targetProfitRate: number;
  stopLossRate: number;
  targetPrice: number;
  stopLossPrice: number;
  currentPrice: number | null;
  profitAmount: number | null;
  profitRate: number | null;
  memo: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
};

export type EnvStatus = {
  key: string;
  configured: boolean;
};

export type OhlcvPeriod = "daily" | "weekly" | "monthly" | "yearly";

export type OhlcvPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradingValue: number;
};

export type TechnicalIndicatorPoint = OhlcvPoint & {
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  ma120: number | null;
  ma200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  atr14: number | null;
  volumeMa20: number | null;
  tradingValueMa20: number | null;
};

export type PeriodTrend = {
  label: string;
  trend: "상승" | "중립" | "하락" | "데이터 부족";
  summary: string;
};

export type TechnicalAnalysisResult = {
  points: TechnicalIndicatorPoint[];
  latest: TechnicalIndicatorPoint | null;
  trend: PeriodTrend;
  high52Week: number | null;
  low52Week: number | null;
  previousHigh: number | null;
  previousLow: number | null;
  signals: string[];
  message: string;
};

export type VolumeAnalysisResult = {
  average5: number | null;
  average20: number | null;
  average60: number | null;
  currentTradingValue: number | null;
  tradingValueRatio20: number | null;
  isSurging: boolean;
  isDrying: boolean;
  isHighAreaDistributionRisk: boolean;
  summary: string;
};

export type SupportResistanceResult = {
  supportLevels: number[];
  resistanceLevels: number[];
  primarySupport: number | null;
  primaryResistance: number | null;
  summary: string;
};

export type ScoreResult = {
  technicalScore: number | null;
  volumeScore: number | null;
  riskScore: number | null;
  reasons: string[];
};

export type EntrySuitability = "적합" | "분할 접근" | "관망" | "부적합" | "데이터 부족";

export type FinalOpinionBase = "매수 가능" | "분할매수" | "관망" | "위험" | "매수금지";

export type Sentiment = "positive" | "negative" | "neutral";

export type EntryPriceScenario = {
  label: "보수적" | "중립적" | "공격적";
  buyPrice: number | null;
  targetPrice: number | null;
  stopLossPrice: number | null;
  expectedProfit: number | null;
  expectedLoss: number | null;
  riskRewardRatio: number | null;
  suitability: EntrySuitability;
  reasoning: string[];
};

export type EntryPriceResult = {
  conservativeBuyPrice: number | null;
  neutralBuyPrice: number | null;
  aggressiveBuyPrice: number | null;
  stopLossPrice: number | null;
  targetPrice1: number | null;
  targetPrice2: number | null;
  riskRewardRatio: number | null;
  entrySuitability: EntrySuitability;
  finalOpinionBase: FinalOpinionBase;
  scenarios: EntryPriceScenario[];
  reasoning: string[];
  warningMessage: string;
};

export type DisclosureItem = {
  stockCode: string;
  stockName: string;
  reportName: string;
  receivedAt: string;
  receiptNo: string;
  url: string;
  sentiment: Sentiment;
  matchedKeywords: string[];
};

export type DisclosureResult = {
  items: DisclosureItem[];
  status: "ready" | "disabled" | "data-unavailable";
  message: string;
  disclosureScore: number | null;
  positiveCount: number;
  negativeCount: number;
};

export type FinancialMetric = {
  label: string;
  value: number | null;
  unit: string;
  source?: string;
};

export type FinancialResult = {
  metrics: FinancialMetric[];
  status: "ready" | "disabled" | "data-unavailable";
  message: string;
  financialScore: number | null;
  summary: string;
};

export type NewsItem = {
  stockCode: string;
  stockName: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  sentiment: Sentiment;
  category: "performance" | "theme" | "risk" | "general";
  matchedKeywords: string[];
};

export type NewsResult = {
  items: NewsItem[];
  status: "ready" | "disabled" | "data-unavailable";
  message: string;
  newsScore: number | null;
  positiveCount: number;
  negativeCount: number;
};

export type AiFinalOpinion = "매수 가능" | "분할매수" | "관망" | "위험" | "매수금지";

export type AiRiskLevel = "낮음" | "보통" | "주의" | "높음" | "매우 높음";

export type AiJudgeResult = {
  finalOpinion: AiFinalOpinion;
  confidence: number;
  riskLevel: AiRiskLevel;
  conservativeBuyPrice: number | null;
  neutralBuyPrice: number | null;
  aggressiveBuyPrice: number | null;
  stopLossPrice: number | null;
  targetPrice1: number | null;
  targetPrice2: number | null;
  riskRewardRatio: number | null;
  positiveFactors: string[];
  negativeFactors: string[];
  entryStrategy: string;
  riskManagement: string;
  summary: string;
  warningMessage: string;
  source: "openai" | "gemini" | "fallback";
  status: "ready" | "disabled" | "fallback";
  message: string;
};

export type AiJudgePayload = {
  stock: Stock;
  currentPrice: number | null;
  targetProfitRate: number;
  dailyAnalysis: TechnicalAnalysisResult;
  periodAnalysis?: {
    daily?: string;
    weekly?: string;
    monthly?: string;
    yearly?: string;
  };
  score: ScoreResult;
  supportResistance: SupportResistanceResult;
  entryPrice: EntryPriceResult;
  disclosures: DisclosureResult | null;
  financials: FinancialResult | null;
  news: NewsResult | null;
};

export type StockPriceQuote = Stock & {
  currentPrice: number | null;
  changeAmount: number | null;
  changeRate: number | null;
  previousClose: number | null;
  updatedAt: string | null;
  status: "ready" | "data-unavailable" | "sample";
  message: string;
};

export type OhlcvResult = {
  stockCode: string;
  period: OhlcvPeriod;
  points: OhlcvPoint[];
  status: "ready" | "data-unavailable" | "sample";
  message: string;
};

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; reason?: "missing-env" | "data-unavailable" | "invalid-input" };

export type AlertType =
  | "target_profit"
  | "stop_loss"
  | "watchlist_buy_price"
  | "trading_value_surge"
  | "negative_disclosure"
  | "price_drop"
  | "new_recommendation";

export type AlertChannel = "telegram";

export type AlertSetting = {
  id: string;
  type: AlertType;
  enabled: boolean | string;
  stockCode: string;
  stockName: string;
  condition: string;
  targetValue: number | string;
  channel: AlertChannel;
  createdAt: string;
  updatedAt: string;
};

export type AlertLog = {
  id: string;
  stockCode: string;
  stockName: string;
  alertType: AlertType | string;
  message: string;
  currentPrice: number | string;
  targetPrice: number | string;
  profitRate: number | string;
  channel: AlertChannel | string;
  sentAt: string;
};

export type AlertCandidate = {
  stockCode: string;
  stockName: string;
  alertType: AlertType;
  message: string;
  currentPrice: number | null;
  targetPrice: number | null;
  stopLossPrice: number | null;
  profitRate: number | null;
  channel: AlertChannel;
  severity?: "normal" | "high";
};

export type UniverseType =
  | "KOSPI200"
  | "KOSDAQ150"
  | "KOSDAQ100"
  | "KOSPI200_KOSDAQ100"
  | "CUSTOM";

export type ScanTarget = "KOSPI200" | "KOSDAQ100" | "KOSPI200_KOSDAQ100";

export type RiskProfile = "conservative" | "neutral" | "aggressive";

export type RecommendationType =
  | "즉시 관심 후보"
  | "분할매수 후보"
  | "눌림목 대기 후보"
  | "돌파 관심 후보"
  | "제외 후보";

export type UniverseConstituent = Stock & {
  id: string;
  universeType: UniverseType;
  marketCap: number | null;
  avgTradingValue20: number | null;
  isActive: boolean;
  updatedAt: string;
};

export type ScanFilters = {
  target: ScanTarget;
  targetProfitRate: number;
  minTradingValue: number;
  minMarketCap: number;
  riskProfile: RiskProfile;
  forceRescan?: boolean;
  maxAiCandidates?: number;
};

export type ScanStatus = "running" | "completed" | "failed";

export type ScanRun = {
  id: string;
  universeType: UniverseType | ScanTarget;
  targetProfitRate: number;
  minMarketCap: number;
  minTradingValue: number;
  riskProfile: RiskProfile;
  totalScanned: number;
  totalPassed: number;
  totalRecommended: number;
  startedAt: string;
  finishedAt: string;
  status: ScanStatus;
  errorMessage: string;
};

export type ScanResultRow = {
  id: string;
  scanRunId: string;
  stockCode: string;
  stockName: string;
  market: Market;
  currentPrice: number | null;
  changeRate: number | null;
  tradingValue: number | null;
  marketCap: number | null;
  technicalScore: number | null;
  volumeScore: number | null;
  financialScore: number | null;
  disclosureScore: number | null;
  newsScore: number | null;
  riskScore: number | null;
  totalScore: number | null;
  conservativeBuyPrice: number | null;
  neutralBuyPrice: number | null;
  aggressiveBuyPrice: number | null;
  stopLossPrice: number | null;
  targetPrice1: number | null;
  targetPrice2: number | null;
  riskRewardRatio: number | null;
  finalOpinion: string;
  recommendationType: RecommendationType;
  riskLevel: string;
  summary: string;
  analyzedAt: string;
};

export type RecommendedCandidate = {
  id: string;
  scanRunId: string;
  stockCode: string;
  stockName: string;
  rank: number;
  recommendationType: RecommendationType;
  finalOpinion: string;
  currentPrice: number | null;
  neutralBuyPrice: number | null;
  stopLossPrice: number | null;
  targetPrice1: number | null;
  targetPrice2: number | null;
  totalScore: number | null;
  riskLevel: string;
  summary: string;
  createdAt: string;
};

export type ScanRunResponse = {
  run: ScanRun;
  results: ScanResultRow[];
  recommendations: RecommendedCandidate[];
  cached: boolean;
  message: string;
};
