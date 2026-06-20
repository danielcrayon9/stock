import { DEFAULT_BROKER_ID, getBrokerFee } from "@/lib/brokerFees";

export function calculatePortfolioValues(input: {
  avgBuyPrice: number;
  quantity: number;
  targetProfitRate: number;
  stopLossRate: number;
  currentPrice?: number | null;
  brokerId?: string;
  applySellFee?: boolean;
}) {
  const investedAmount = input.avgBuyPrice * input.quantity;
  const targetPrice = Math.round(input.avgBuyPrice * (1 + input.targetProfitRate / 100));
  const stopLossPrice = Math.round(input.avgBuyPrice * (1 - input.stopLossRate / 100));
  const broker = getBrokerFee(input.brokerId ?? DEFAULT_BROKER_ID);
  const applySellFee = Boolean(input.applySellFee);

  if (input.currentPrice == null) {
    return {
      investedAmount,
      targetPrice,
      stopLossPrice,
      currentPrice: null,
      brokerId: broker.id,
      brokerName: broker.name,
      applySellFee,
      sellCommissionRate: broker.sellCommissionRate,
      sellCommissionAmount: null,
      profitAmount: null,
      profitRate: null,
    };
  }

  const currentValue = input.currentPrice * input.quantity;
  const sellCommissionAmount = applySellFee ? Math.round(currentValue * broker.sellCommissionRate) : 0;
  const profitAmount = currentValue - investedAmount - sellCommissionAmount;
  const profitRate = investedAmount > 0 ? (profitAmount / investedAmount) * 100 : null;

  return {
    investedAmount,
    targetPrice,
    stopLossPrice,
    currentPrice: input.currentPrice,
    brokerId: broker.id,
    brokerName: broker.name,
    applySellFee,
    sellCommissionRate: broker.sellCommissionRate,
    sellCommissionAmount,
    profitAmount,
    profitRate,
  };
}
