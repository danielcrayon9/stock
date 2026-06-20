import type { OhlcvPoint, VolumeAnalysisResult } from "@/lib/types";

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value: number | null, digits = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

export function analyzeVolume(points: OhlcvPoint[]): VolumeAnalysisResult {
  if (points.length < 20) {
    return {
      average5: null,
      average20: null,
      average60: null,
      currentTradingValue: null,
      tradingValueRatio20: null,
      isSurging: false,
      isDrying: false,
      isHighAreaDistributionRisk: false,
      summary: "거래대금 분석에는 최소 20개 이상의 봉 데이터가 필요합니다.",
    };
  }

  const latest = points.at(-1);
  const tradingValues = points.map((point) => point.tradingValue);
  const average5 = average(tradingValues.slice(-5));
  const average20 = average(tradingValues.slice(-20));
  const average60 = points.length >= 60 ? average(tradingValues.slice(-60)) : null;
  const currentTradingValue = latest?.tradingValue ?? null;
  const tradingValueRatio20 =
    currentTradingValue != null && average20 != null && average20 > 0 ? currentTradingValue / average20 : null;

  const recent60 = points.slice(-60);
  const high60 = Math.max(...recent60.map((point) => point.high));
  const isNearHigh = latest ? latest.close >= high60 * 0.9 : false;
  const isBearCandle = latest ? latest.close < latest.open : false;
  const isSurging = tradingValueRatio20 != null && tradingValueRatio20 >= 1.5;
  const isDrying = tradingValueRatio20 != null && tradingValueRatio20 <= 0.6;
  const isHighAreaDistributionRisk = isNearHigh && isBearCandle && tradingValueRatio20 != null && tradingValueRatio20 >= 2;

  let summary = "거래대금은 20봉 평균과 유사한 수준입니다.";
  if (isHighAreaDistributionRisk) {
    summary = "고점권에서 거래대금이 급증한 음봉이 발생해 분산 매도 위험을 점검해야 합니다.";
  } else if (isSurging) {
    summary = "거래대금이 20봉 평균 대비 1.5배 이상 증가했습니다.";
  } else if (isDrying) {
    summary = "거래대금이 20봉 평균 대비 크게 줄어 수급 강도가 약합니다.";
  }

  return {
    average5: round(average5, 0),
    average20: round(average20, 0),
    average60: round(average60, 0),
    currentTradingValue: round(currentTradingValue, 0),
    tradingValueRatio20: round(tradingValueRatio20),
    isSurging,
    isDrying,
    isHighAreaDistributionRisk,
    summary,
  };
}
