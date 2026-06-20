import { calculateEntryPrices } from "@/lib/entryPriceEngine";
import { scoreAnalysis } from "@/lib/scoringEngine";
import { findSupportResistance } from "@/lib/supportResistance";
import { analyzeTechnical } from "@/lib/technicalAnalysis";
import { DEFAULT_TRADING_COST, netReturnRate, type TradingCostModel } from "@/lib/tradingCost";
import { analyzeVolume } from "@/lib/volumeAnalysis";
import type { OhlcvPoint } from "@/lib/types";

export type BacktestExitReason = "target" | "stop" | "time_exit";

export type BacktestTrade = {
  signalDate: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  grossReturnRate: number;
  netReturnRate: number;
  holdingDays: number;
  exitReason: BacktestExitReason;
};

export type DailyBacktestResult = {
  trades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  targetHitRate: number | null;
  stopHitRate: number | null;
  averageNetReturn: number | null;
  expectancy: number | null;
  maxDrawdown: number | null;
  averageHoldingDays: number | null;
  testedSignals: number;
  skippedSignals: number;
  summary: string;
};

const DEFAULT_LOOKBACK_DAYS = 120;
const DEFAULT_MAX_HOLDING_DAYS = 5;
const MIN_HISTORY_DAYS = 60;

function roundRate(value: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function maxDrawdownFromReturns(returns: number[]) {
  if (returns.length === 0) return null;
  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;

  for (const value of returns) {
    equity *= 1 + value / 100;
    peak = Math.max(peak, equity);
    if (peak > 0) {
      maxDrawdown = Math.min(maxDrawdown, (equity - peak) / peak);
    }
  }

  return maxDrawdown * 100;
}

function simulateForwardTrade({
  signalDate,
  future,
  entryPrice,
  targetPrice,
  stopLossPrice,
  maxHoldingDays,
  cost,
}: {
  signalDate: string;
  future: OhlcvPoint[];
  entryPrice: number;
  targetPrice: number;
  stopLossPrice: number;
  maxHoldingDays: number;
  cost: TradingCostModel;
}): BacktestTrade | null {
  let enteredAt: OhlcvPoint | null = null;

  for (const day of future.slice(0, maxHoldingDays)) {
    if (!enteredAt) {
      if (day.low > entryPrice) continue;
      enteredAt = day;
    }

    const hitStop = day.low <= stopLossPrice;
    const hitTarget = day.high >= targetPrice;

    // 일봉은 장중 순서를 알 수 없으므로 같은 날 동시 도달 시 보수적으로 손절 우선 처리한다.
    if (hitStop || hitTarget) {
      const exitReason: BacktestExitReason = hitStop ? "stop" : "target";
      const exitPrice = hitStop ? stopLossPrice : targetPrice;
      const net = netReturnRate(entryPrice, exitPrice, cost);
      if (net == null) return null;
      return {
        signalDate,
        entryDate: enteredAt.date,
        exitDate: day.date,
        entryPrice,
        exitPrice,
        grossReturnRate: ((exitPrice - entryPrice) / entryPrice) * 100,
        netReturnRate: net,
        holdingDays: Math.max(1, future.indexOf(day) + 1),
        exitReason,
      };
    }
  }

  if (!enteredAt || future.length === 0) return null;

  const exitDay = future[Math.min(maxHoldingDays, future.length) - 1];
  const net = netReturnRate(entryPrice, exitDay.close, cost);
  if (net == null) return null;
  return {
    signalDate,
    entryDate: enteredAt.date,
    exitDate: exitDay.date,
    entryPrice,
    exitPrice: exitDay.close,
    grossReturnRate: ((exitDay.close - entryPrice) / entryPrice) * 100,
    netReturnRate: net,
    holdingDays: Math.max(1, future.indexOf(exitDay) + 1),
    exitReason: "time_exit",
  };
}

export function runDailyBacktest({
  points,
  targetProfitRate,
  lookbackDays = DEFAULT_LOOKBACK_DAYS,
  maxHoldingDays = DEFAULT_MAX_HOLDING_DAYS,
  cost = DEFAULT_TRADING_COST,
}: {
  points: OhlcvPoint[];
  targetProfitRate: number;
  lookbackDays?: number;
  maxHoldingDays?: number;
  cost?: TradingCostModel;
}): DailyBacktestResult {
  if (points.length < MIN_HISTORY_DAYS + maxHoldingDays + 1) {
    return {
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: null,
      targetHitRate: null,
      stopHitRate: null,
      averageNetReturn: null,
      expectancy: null,
      maxDrawdown: null,
      averageHoldingDays: null,
      testedSignals: 0,
      skippedSignals: 0,
      summary: "백테스트 데이터 부족",
    };
  }

  const start = Math.max(MIN_HISTORY_DAYS, points.length - lookbackDays - maxHoldingDays);
  const end = points.length - maxHoldingDays;
  const trades: BacktestTrade[] = [];
  let testedSignals = 0;
  let skippedSignals = 0;

  for (let index = start; index < end; index += 1) {
    const history = points.slice(0, index + 1);
    const technical = analyzeTechnical(history, "일봉");
    const volume = analyzeVolume(history);
    const supportResistance = findSupportResistance(history);
    const score = scoreAnalysis(technical, volume, supportResistance);
    const entry = calculateEntryPrices({ technical, supportResistance, volume, score, targetProfitRate });

    testedSignals += 1;
    const entryPrice = entry.neutralBuyPrice;
    const targetPrice = entry.targetPrice1;
    const stopLossPrice = entry.stopLossPrice;

    if (
      entryPrice == null ||
      targetPrice == null ||
      stopLossPrice == null ||
      entry.riskRewardRatio == null ||
      entry.riskRewardRatio < 2 ||
      entry.finalOpinionBase === "매수금지" ||
      entry.finalOpinionBase === "위험"
    ) {
      skippedSignals += 1;
      continue;
    }

    const trade = simulateForwardTrade({
      signalDate: points[index].date,
      future: points.slice(index + 1, index + 1 + maxHoldingDays),
      entryPrice,
      targetPrice,
      stopLossPrice,
      maxHoldingDays,
      cost,
    });

    if (trade) {
      trades.push(trade);
    } else {
      skippedSignals += 1;
    }
  }

  const returns = trades.map((trade) => trade.netReturnRate);
  const wins = trades.filter((trade) => trade.netReturnRate > 0).length;
  const losses = trades.filter((trade) => trade.netReturnRate <= 0).length;
  const targetHits = trades.filter((trade) => trade.exitReason === "target").length;
  const stopHits = trades.filter((trade) => trade.exitReason === "stop").length;
  const averageNet = average(returns);
  const winRate = trades.length > 0 ? (wins / trades.length) * 100 : null;
  const targetHitRate = trades.length > 0 ? (targetHits / trades.length) * 100 : null;
  const stopHitRate = trades.length > 0 ? (stopHits / trades.length) * 100 : null;
  const averageHoldingDays = average(trades.map((trade) => trade.holdingDays));

  const summary =
    trades.length === 0
      ? "최근 일봉 기준 유효한 과거 진입 사례가 부족합니다."
      : `최근 ${lookbackDays}거래일 재현: ${trades.length}회 체결, 승률 ${roundRate(winRate)}%, 평균 순수익률 ${roundRate(averageNet)}%`;

  return {
    trades: trades.length,
    wins,
    losses,
    winRate: roundRate(winRate),
    targetHitRate: roundRate(targetHitRate),
    stopHitRate: roundRate(stopHitRate),
    averageNetReturn: roundRate(averageNet),
    expectancy: roundRate(averageNet),
    maxDrawdown: roundRate(maxDrawdownFromReturns(returns)),
    averageHoldingDays: roundRate(averageHoldingDays),
    testedSignals,
    skippedSignals,
    summary,
  };
}
