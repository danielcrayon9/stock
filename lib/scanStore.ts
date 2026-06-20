import { getRows, hasGoogleSheetsConfig } from "@/lib/googleSheets";
import { kstDateString } from "@/lib/time";
import type {
  Market,
  RecommendationType,
  RecommendedCandidate,
  RiskProfile,
  ScanFilters,
  ScanResultRow,
  ScanRun,
  ScanStatus,
  UniverseType,
} from "@/lib/types";

type RawRow = Record<string, string | boolean>;

function num(value: string | boolean | undefined): number | null {
  if (value == null || value === "" || typeof value === "boolean") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function str(value: string | boolean | undefined): string {
  if (value == null || typeof value === "boolean") return "";
  return value;
}

function parseRun(row: RawRow): ScanRun {
  return {
    id: str(row.id),
    universeType: str(row.universeType) as UniverseType,
    targetProfitRate: num(row.targetProfitRate) ?? 0,
    minMarketCap: num(row.minMarketCap) ?? 0,
    minTradingValue: num(row.minTradingValue) ?? 0,
    riskProfile: (str(row.riskProfile) || "neutral") as RiskProfile,
    totalScanned: num(row.totalScanned) ?? 0,
    totalPassed: num(row.totalPassed) ?? 0,
    totalRecommended: num(row.totalRecommended) ?? 0,
    startedAt: str(row.startedAt),
    finishedAt: str(row.finishedAt),
    status: (str(row.status) || "completed") as ScanStatus,
    errorMessage: str(row.errorMessage),
  };
}

function parseResult(row: RawRow): ScanResultRow {
  return {
    id: str(row.id),
    scanRunId: str(row.scanRunId),
    stockCode: str(row.stockCode),
    stockName: str(row.stockName),
    market: (str(row.market) || "UNKNOWN") as Market,
    currentPrice: num(row.currentPrice),
    changeRate: num(row.changeRate),
    tradingValue: num(row.tradingValue),
    marketCap: num(row.marketCap),
    technicalScore: num(row.technicalScore),
    volumeScore: num(row.volumeScore),
    financialScore: num(row.financialScore),
    disclosureScore: num(row.disclosureScore),
    newsScore: num(row.newsScore),
    riskScore: num(row.riskScore),
    totalScore: num(row.totalScore),
    conservativeBuyPrice: num(row.conservativeBuyPrice),
    neutralBuyPrice: num(row.neutralBuyPrice),
    aggressiveBuyPrice: num(row.aggressiveBuyPrice),
    stopLossPrice: num(row.stopLossPrice),
    targetPrice1: num(row.targetPrice1),
    targetPrice2: num(row.targetPrice2),
    riskRewardRatio: num(row.riskRewardRatio),
    grossProfitRate: num(row.grossProfitRate),
    grossLossRate: num(row.grossLossRate),
    netProfitRate: num(row.netProfitRate),
    netLossRate: num(row.netLossRate),
    netRiskRewardRatio: num(row.netRiskRewardRatio),
    breakEvenRate: num(row.breakEvenRate),
    totalTradingCostRate: num(row.totalTradingCostRate),
    costDescription: str(row.costDescription),
    backtestTrades: num(row.backtestTrades),
    backtestWinRate: num(row.backtestWinRate),
    backtestAverageNetReturn: num(row.backtestAverageNetReturn),
    backtestExpectancy: num(row.backtestExpectancy),
    backtestMaxDrawdown: num(row.backtestMaxDrawdown),
    backtestTargetHitRate: num(row.backtestTargetHitRate),
    backtestStopHitRate: num(row.backtestStopHitRate),
    backtestAverageHoldingDays: num(row.backtestAverageHoldingDays),
    backtestSummary: str(row.backtestSummary),
    finalOpinion: str(row.finalOpinion),
    recommendationType: (str(row.recommendationType) || "제외 후보") as RecommendationType,
    riskLevel: str(row.riskLevel),
    summary: str(row.summary),
    analyzedAt: str(row.analyzedAt),
  };
}

function parseCandidate(row: RawRow): RecommendedCandidate {
  return {
    id: str(row.id),
    scanRunId: str(row.scanRunId),
    stockCode: str(row.stockCode),
    stockName: str(row.stockName),
    rank: num(row.rank) ?? 0,
    recommendationType: (str(row.recommendationType) || "제외 후보") as RecommendationType,
    finalOpinion: str(row.finalOpinion),
    currentPrice: num(row.currentPrice),
    neutralBuyPrice: num(row.neutralBuyPrice),
    stopLossPrice: num(row.stopLossPrice),
    targetPrice1: num(row.targetPrice1),
    targetPrice2: num(row.targetPrice2),
    totalScore: num(row.totalScore),
    netProfitRate: num(row.netProfitRate),
    netLossRate: num(row.netLossRate),
    netRiskRewardRatio: num(row.netRiskRewardRatio),
    backtestTrades: num(row.backtestTrades),
    backtestWinRate: num(row.backtestWinRate),
    backtestAverageNetReturn: num(row.backtestAverageNetReturn),
    backtestMaxDrawdown: num(row.backtestMaxDrawdown),
    riskLevel: str(row.riskLevel),
    summary: str(row.summary),
    createdAt: str(row.createdAt),
  };
}

export async function getScanRuns(): Promise<ScanRun[]> {
  if (!hasGoogleSheetsConfig()) return [];
  try {
    const rows = await getRows<RawRow>("scan_runs");
    return rows.map(parseRun).sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  } catch {
    return [];
  }
}

export async function getLatestScanRun(): Promise<ScanRun | null> {
  const runs = await getScanRuns();
  return runs.find((run) => run.status === "completed") ?? runs[0] ?? null;
}

export async function getScanResults(scanRunId: string): Promise<ScanResultRow[]> {
  if (!hasGoogleSheetsConfig()) return [];
  try {
    const rows = await getRows<RawRow>("scan_results");
    return rows
      .map(parseResult)
      .filter((row) => row.scanRunId === scanRunId)
      .sort((left, right) => (right.totalScore ?? 0) - (left.totalScore ?? 0));
  } catch {
    return [];
  }
}

export async function getRecommendations(scanRunId: string): Promise<RecommendedCandidate[]> {
  if (!hasGoogleSheetsConfig()) return [];
  try {
    const rows = await getRows<RawRow>("recommended_candidates");
    return rows
      .map(parseCandidate)
      .filter((row) => row.scanRunId === scanRunId)
      .sort((left, right) => left.rank - right.rank);
  } catch {
    return [];
  }
}

/** 같은 날(KST) 같은 조건의 완료된 스캔이 있으면 반환한다. */
export async function findCachedRunToday(filters: ScanFilters): Promise<ScanRun | null> {
  const today = kstDateString();
  const runs = await getScanRuns();
  return (
    runs.find(
      (run) =>
        run.status === "completed" &&
        run.universeType === filters.target &&
        run.targetProfitRate === filters.targetProfitRate &&
        run.minMarketCap === filters.minMarketCap &&
        run.minTradingValue === filters.minTradingValue &&
        run.riskProfile === filters.riskProfile &&
        kstDateString(new Date(run.startedAt)) === today,
    ) ?? null
  );
}
