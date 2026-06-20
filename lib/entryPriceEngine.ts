import type {
  EntryPriceResult,
  EntryPriceScenario,
  EntrySuitability,
  FinalOpinionBase,
  ScoreResult,
  SupportResistanceResult,
  TechnicalAnalysisResult,
  VolumeAnalysisResult,
} from "@/lib/types";

type EntryPriceInput = {
  technical: TechnicalAnalysisResult;
  supportResistance: SupportResistanceResult;
  volume: VolumeAnalysisResult;
  score: ScoreResult;
  targetProfitRate: number;
};

function roundPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value <= 0) return null;
  if (value >= 100000) return Math.round(value / 500) * 500;
  if (value >= 10000) return Math.round(value / 100) * 100;
  if (value >= 1000) return Math.round(value / 10) * 10;
  return Math.round(value);
}

function minValid(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  return valid.length > 0 ? Math.min(...valid) : null;
}

function maxValid(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value > 0);
  return valid.length > 0 ? Math.max(...valid) : null;
}

function nearestBelow(currentPrice: number, values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => value != null && Number.isFinite(value) && value > 0 && value < currentPrice);
  return valid.length > 0 ? Math.max(...valid) : null;
}

function maxValidNearAbove(currentPrice: number, maxPremiumRate: number, values: Array<number | null | undefined>) {
  const upperBound = currentPrice * (1 + maxPremiumRate);
  const valid = values.filter(
    (value): value is number =>
      value != null && Number.isFinite(value) && value > 0 && value >= currentPrice && value <= upperBound,
  );
  return valid.length > 0 ? Math.max(...valid) : null;
}

function maxValidInPriceBand(
  currentPrice: number,
  maxDiscountRate: number,
  maxPremiumRate: number,
  values: Array<number | null | undefined>,
) {
  const lowerBound = currentPrice * (1 - maxDiscountRate);
  const upperBound = currentPrice * (1 + maxPremiumRate);
  const valid = values.filter(
    (value): value is number =>
      value != null && Number.isFinite(value) && value > 0 && value >= lowerBound && value <= upperBound,
  );
  return valid.length > 0 ? Math.max(...valid) : null;
}

function nearestAboveInBand(
  currentPrice: number,
  minUpsideRate: number,
  maxUpsideRate: number,
  values: Array<number | null | undefined>,
) {
  const lowerBound = currentPrice * (1 + minUpsideRate);
  const upperBound = currentPrice * (1 + maxUpsideRate);
  const valid = values.filter(
    (value): value is number =>
      value != null && Number.isFinite(value) && value > 0 && value >= lowerBound && value <= upperBound,
  );
  return valid.length > 0 ? Math.min(...valid) : null;
}

function fallbackTarget(currentPrice: number, atr: number | null, minRate: number, maxRate: number) {
  const atrMove = atr != null ? (atr / currentPrice) * 2.2 : minRate;
  const rate = Math.max(minRate, Math.min(maxRate, atrMove));
  return currentPrice * (1 + rate);
}

function ratio(targetPrice: number | null, buyPrice: number | null, stopLossPrice: number | null) {
  if (targetPrice == null || buyPrice == null || stopLossPrice == null) return null;
  const expectedProfit = targetPrice - buyPrice;
  const expectedLoss = buyPrice - stopLossPrice;
  if (expectedProfit <= 0 || expectedLoss <= 0) return null;
  return expectedProfit / expectedLoss;
}

function scenarioSuitability(
  buyPrice: number | null,
  targetPrice: number | null,
  stopLossPrice: number | null,
  riskRewardRatio: number | null,
  riskScore: number | null,
): EntrySuitability {
  if (buyPrice == null || targetPrice == null || stopLossPrice == null || riskRewardRatio == null) return "데이터 부족";
  if (stopLossPrice >= buyPrice) return "부적합";
  const lossRate = (buyPrice - stopLossPrice) / buyPrice;
  if (lossRate > 0.12) return "관망";
  if (riskRewardRatio < 2) return "관망";
  if (riskScore != null && riskScore >= 70) return "부적합";
  if (lossRate > 0.08 && riskScore != null && riskScore >= 55) return "분할 접근";
  if (riskScore != null && riskScore >= 55) return "분할 접근";
  return "적합";
}

function createScenario(
  label: EntryPriceScenario["label"],
  buyPrice: number | null,
  targetPrice: number | null,
  stopLossPrice: number | null,
  riskScore: number | null,
  reasoning: string[],
): EntryPriceScenario {
  const roundedBuy = roundPrice(buyPrice);
  const roundedTarget = roundPrice(targetPrice);
  const roundedStop = roundPrice(stopLossPrice);
  const riskRewardRatio = ratio(roundedTarget, roundedBuy, roundedStop);

  return {
    label,
    buyPrice: roundedBuy,
    targetPrice: roundedTarget,
    stopLossPrice: roundedStop,
    expectedProfit: roundedTarget != null && roundedBuy != null ? roundPrice(roundedTarget - roundedBuy) : null,
    expectedLoss: roundedBuy != null && roundedStop != null ? roundPrice(roundedBuy - roundedStop) : null,
    riskRewardRatio: riskRewardRatio == null ? null : Math.round(riskRewardRatio * 100) / 100,
    suitability: scenarioSuitability(roundedBuy, roundedTarget, roundedStop, riskRewardRatio, riskScore),
    reasoning,
  };
}

function decideFinalOpinion(scenarios: EntryPriceScenario[], score: ScoreResult, volume: VolumeAnalysisResult): {
  entrySuitability: EntrySuitability;
  finalOpinionBase: FinalOpinionBase;
  riskRewardRatio: number | null;
} {
  const validRatios = scenarios
    .map((scenario) => scenario.riskRewardRatio)
    .filter((value): value is number => value != null && Number.isFinite(value));
  const bestRatio = validRatios.length > 0 ? Math.max(...validRatios) : null;
  const suitableCount = scenarios.filter((scenario) => scenario.suitability === "적합").length;
  const splitCount = scenarios.filter((scenario) => scenario.suitability === "분할 접근").length;

  if (scenarios.every((scenario) => scenario.suitability === "데이터 부족")) {
    return { entrySuitability: "데이터 부족", finalOpinionBase: "매수금지", riskRewardRatio: bestRatio };
  }
  if (bestRatio == null || bestRatio < 2) {
    return { entrySuitability: "관망", finalOpinionBase: "관망", riskRewardRatio: bestRatio };
  }
  if ((score.riskScore ?? 100) >= 70 || volume.isHighAreaDistributionRisk) {
    return { entrySuitability: "부적합", finalOpinionBase: "위험", riskRewardRatio: bestRatio };
  }
  if (suitableCount >= 2 && (score.technicalScore ?? 0) >= 70 && (score.volumeScore ?? 0) >= 55) {
    return { entrySuitability: "적합", finalOpinionBase: "매수 가능", riskRewardRatio: bestRatio };
  }
  if (suitableCount >= 1 || splitCount >= 1) {
    return { entrySuitability: "분할 접근", finalOpinionBase: "분할매수", riskRewardRatio: bestRatio };
  }
  return { entrySuitability: "관망", finalOpinionBase: "관망", riskRewardRatio: bestRatio };
}

export function calculateEntryPrices({
  technical,
  supportResistance,
  volume,
  score,
  targetProfitRate,
}: EntryPriceInput): EntryPriceResult {
  const latest = technical.latest;
  if (!latest) {
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
      reasoning: ["매수가 산정에는 OHLCV와 기술 지표 데이터가 필요합니다."],
      warningMessage: "데이터 부족: 손절가를 산출할 수 없어 매수 가능 의견을 제공하지 않습니다.",
    };
  }

  const currentPrice = latest.close;
  const atr = latest.atr14;
  const support = supportResistance.primarySupport;
  const resistance = supportResistance.primaryResistance;
  const previousHigh = technical.previousHigh;
  const previousLow = technical.previousLow;
  const high52Week = technical.high52Week;
  const targetRate = Math.max(3, targetProfitRate) / 100;

  const conservativeBuyPrice = maxValidInPriceBand(currentPrice, 0.18, 0.005, [
    support != null ? support * 1.005 : null,
    latest.ma60 != null ? latest.ma60 * 1.002 : null,
    latest.ma120 != null ? latest.ma120 * 1.002 : null,
    latest.bollingerLower != null ? latest.bollingerLower * 1.01 : null,
    atr != null ? currentPrice - atr * 1.2 : null,
  ]);
  const neutralBuyPrice = maxValidInPriceBand(currentPrice, 0.08, 0.01, [
    latest.ma20 != null ? latest.ma20 * 1.002 : null,
    support != null ? support * 1.015 : null,
    previousHigh != null ? previousHigh * 0.97 : null,
    atr != null ? currentPrice - atr * 0.55 : null,
  ]);
  const isOverheated =
    (latest.rsi14 != null && latest.rsi14 >= 72) ||
    (latest.ma20 != null && atr != null && currentPrice > latest.ma20 + atr * 2);
  const aggressiveBuyPrice = isOverheated
    ? null
    : maxValidNearAbove(currentPrice, 0.02, [
        previousHigh != null ? previousHigh * 1.003 : null,
        resistance != null ? resistance * 1.002 : null,
        currentPrice,
      ]);

  const referenceBuyPrice = minValid([conservativeBuyPrice, neutralBuyPrice, aggressiveBuyPrice]) ?? currentPrice;
  const structuralStop = nearestBelow(referenceBuyPrice, [
    support != null ? support * 0.985 : null,
    previousLow != null ? previousLow * 0.985 : null,
    latest.ma60 != null ? latest.ma60 * 0.97 : null,
    latest.bollingerLower != null ? latest.bollingerLower * 0.98 : null,
  ]);
  const atrStop = atr != null ? referenceBuyPrice - atr * 1.5 : null;
  const stopLossPrice = roundPrice(maxValid([structuralStop, atrStop]));

  if (stopLossPrice == null || stopLossPrice >= currentPrice) {
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
      reasoning: ["주요 지지선, ATR, 이동평균 기준으로 유효한 손절가를 산출하지 못했습니다."],
      warningMessage: "손절가 산정 불가: 매수 가능 의견을 제공하지 않습니다.",
    };
  }

  const resistanceTarget1 = nearestAboveInBand(currentPrice, 0.04, 0.28, [resistance, previousHigh, high52Week]);
  const targetPrice1 = roundPrice(
    resistanceTarget1 ?? fallbackTarget(currentPrice, atr, Math.min(0.06, targetRate * 0.35), Math.min(0.12, targetRate * 0.7)),
  );
  const resistanceTarget2 = nearestAboveInBand(currentPrice, 0.08, 0.45, [
    high52Week,
    resistance != null ? resistance * 1.05 : null,
    previousHigh != null ? previousHigh * 1.08 : null,
  ]);
  const fallbackTarget2 = targetPrice1 != null
    ? targetPrice1 + Math.max((atr ?? currentPrice * 0.03) * 2, currentPrice * Math.min(0.12, targetRate * 0.65))
    : fallbackTarget(currentPrice, atr, Math.min(0.1, targetRate * 0.5), Math.min(0.22, targetRate));
  const targetPrice2 = roundPrice(maxValid([resistanceTarget2, fallbackTarget2]));

  const scenarios = [
    createScenario("보수적", conservativeBuyPrice, targetPrice1, stopLossPrice, score.riskScore, [
      "주요 지지선, 60/120 이동평균, ATR 변동성을 반영했습니다.",
      "손절폭을 줄이고 손익비가 유리한 구간을 우선합니다.",
    ]),
    createScenario("중립적", neutralBuyPrice, targetPrice1, stopLossPrice, score.riskScore, [
      "20일선 눌림과 전고점 돌파 후 되돌림을 반영했습니다.",
      "현재 추세가 유지된다는 가정의 기준 가격입니다.",
    ]),
    createScenario("공격적", aggressiveBuyPrice, targetPrice2, stopLossPrice, score.riskScore, [
      "현재가 근처 또는 가까운 저항선 돌파 접근을 가정했습니다.",
      "현재가/돌파 접근은 반드시 손절가를 함께 관리해야 합니다.",
    ]),
  ];
  const decision = decideFinalOpinion(scenarios, score, volume);

  const reasoning = [
    support != null ? `주요 지지선: ${roundPrice(support)?.toLocaleString("ko-KR")}원` : "주요 지지선: 데이터 부족",
    resistance != null ? `주요 저항선: ${roundPrice(resistance)?.toLocaleString("ko-KR")}원` : "주요 저항선: 데이터 부족",
    atr != null ? `ATR14 기준 변동성: ${roundPrice(atr)?.toLocaleString("ko-KR")}원` : "ATR14: 데이터 부족",
    "매수가는 지지선·이동평균·ATR 눌림 기준의 실행 가능한 범위만 사용합니다.",
    "목표가는 실제 저항/전고점/52주 고점을 우선하고, 없을 때만 ATR 기반 대체 목표를 사용합니다.",
    decision.riskRewardRatio != null
      ? `최고 손익비: 1:${decision.riskRewardRatio.toFixed(2)}`
      : "손익비: 데이터 부족",
  ];

  if (decision.riskRewardRatio != null && decision.riskRewardRatio < 2) {
    reasoning.push("손익비가 1:2 미만이므로 진입 부적합 또는 관망 기준입니다.");
  }

  return {
    conservativeBuyPrice: scenarios[0].buyPrice,
    neutralBuyPrice: scenarios[1].buyPrice,
    aggressiveBuyPrice: scenarios[2].buyPrice,
    stopLossPrice,
    targetPrice1,
    targetPrice2,
    riskRewardRatio: decision.riskRewardRatio,
    entrySuitability: decision.entrySuitability,
    finalOpinionBase: decision.finalOpinionBase,
    scenarios,
    reasoning,
    warningMessage:
      decision.finalOpinionBase === "매수 가능" || decision.finalOpinionBase === "분할매수"
        ? "룰 기반 참고 결과입니다. 최종 투자 판단과 책임은 사용자에게 있습니다."
        : "손절가, 손익비, 리스크 조건상 관망 또는 진입 부적합 가능성이 있습니다.",
  };
}
