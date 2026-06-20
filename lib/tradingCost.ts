export type TradingCostModel = {
  buyCommissionRate: number;
  sellCommissionRate: number;
  sellTaxRate: number;
  buySlippageRate: number;
  sellSlippageRate: number;
};

export type TradeCostProjection = {
  grossProfitRate: number | null;
  grossLossRate: number | null;
  netProfitRate: number | null;
  netLossRate: number | null;
  netRiskRewardRatio: number | null;
  breakEvenRate: number;
  totalRoundTripCostRate: number;
  costDescription: string;
};

// 기본값은 국내 주식 단기 매매 검증을 위한 보수적 가정이다.
export const DEFAULT_TRADING_COST: TradingCostModel = {
  buyCommissionRate: 0.00015,
  sellCommissionRate: 0.00015,
  sellTaxRate: 0.0018,
  buySlippageRate: 0.001,
  sellSlippageRate: 0.001,
};

function percent(value: number) {
  return Math.round(value * 10_000) / 100;
}

export function netReturnRate(
  entryPrice: number,
  exitPrice: number,
  cost: TradingCostModel = DEFAULT_TRADING_COST,
): number | null {
  if (entryPrice <= 0 || exitPrice <= 0) return null;
  const effectiveBuy = entryPrice * (1 + cost.buyCommissionRate + cost.buySlippageRate);
  const effectiveSell = exitPrice * (1 - cost.sellCommissionRate - cost.sellTaxRate - cost.sellSlippageRate);
  return ((effectiveSell - effectiveBuy) / effectiveBuy) * 100;
}

export function grossReturnRate(entryPrice: number, exitPrice: number): number | null {
  if (entryPrice <= 0 || exitPrice <= 0) return null;
  return ((exitPrice - entryPrice) / entryPrice) * 100;
}

export function breakEvenRate(cost: TradingCostModel = DEFAULT_TRADING_COST): number {
  const buyMultiplier = 1 + cost.buyCommissionRate + cost.buySlippageRate;
  const sellMultiplier = 1 - cost.sellCommissionRate - cost.sellTaxRate - cost.sellSlippageRate;
  if (sellMultiplier <= 0) return 0;
  return (buyMultiplier / sellMultiplier - 1) * 100;
}

export function totalRoundTripCostRate(cost: TradingCostModel = DEFAULT_TRADING_COST): number {
  return (
    cost.buyCommissionRate +
    cost.sellCommissionRate +
    cost.sellTaxRate +
    cost.buySlippageRate +
    cost.sellSlippageRate
  ) * 100;
}

export function describeCostModel(cost: TradingCostModel = DEFAULT_TRADING_COST): string {
  return [
    `매수 수수료 ${percent(cost.buyCommissionRate)}%`,
    `매도 수수료 ${percent(cost.sellCommissionRate)}%`,
    `거래세 ${percent(cost.sellTaxRate)}%`,
    `왕복 슬리피지 ${percent(cost.buySlippageRate + cost.sellSlippageRate)}%`,
  ].join(" · ");
}

export function projectTradeCosts({
  entryPrice,
  targetPrice,
  stopLossPrice,
  cost = DEFAULT_TRADING_COST,
}: {
  entryPrice: number | null;
  targetPrice: number | null;
  stopLossPrice: number | null;
  cost?: TradingCostModel;
}): TradeCostProjection {
  const grossProfitRate =
    entryPrice != null && targetPrice != null ? grossReturnRate(entryPrice, targetPrice) : null;
  const grossLossRate =
    entryPrice != null && stopLossPrice != null ? grossReturnRate(entryPrice, stopLossPrice) : null;
  const netProfitRate =
    entryPrice != null && targetPrice != null ? netReturnRate(entryPrice, targetPrice, cost) : null;
  const netLossRate =
    entryPrice != null && stopLossPrice != null ? netReturnRate(entryPrice, stopLossPrice, cost) : null;
  const netRiskRewardRatio =
    netProfitRate != null && netLossRate != null && netProfitRate > 0 && netLossRate < 0
      ? netProfitRate / Math.abs(netLossRate)
      : null;

  return {
    grossProfitRate,
    grossLossRate,
    netProfitRate,
    netLossRate,
    netRiskRewardRatio,
    breakEvenRate: breakEvenRate(cost),
    totalRoundTripCostRate: totalRoundTripCostRate(cost),
    costDescription: describeCostModel(cost),
  };
}
