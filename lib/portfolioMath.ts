export function calculatePortfolioValues(input: {
  avgBuyPrice: number;
  quantity: number;
  targetProfitRate: number;
  stopLossRate: number;
  currentPrice?: number | null;
}) {
  const investedAmount = input.avgBuyPrice * input.quantity;
  const targetPrice = Math.round(input.avgBuyPrice * (1 + input.targetProfitRate / 100));
  const stopLossPrice = Math.round(input.avgBuyPrice * (1 - input.stopLossRate / 100));

  if (input.currentPrice == null) {
    return {
      investedAmount,
      targetPrice,
      stopLossPrice,
      currentPrice: null,
      profitAmount: null,
      profitRate: null,
    };
  }

  const currentValue = input.currentPrice * input.quantity;
  const profitAmount = currentValue - investedAmount;
  const profitRate = investedAmount > 0 ? (profitAmount / investedAmount) * 100 : null;

  return {
    investedAmount,
    targetPrice,
    stopLossPrice,
    currentPrice: input.currentPrice,
    profitAmount,
    profitRate,
  };
}
