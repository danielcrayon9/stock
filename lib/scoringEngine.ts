import type {
  ScoreResult,
  SupportResistanceResult,
  TechnicalAnalysisResult,
  VolumeAnalysisResult,
} from "@/lib/types";

function clampScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreAnalysis(
  technical: TechnicalAnalysisResult,
  volume: VolumeAnalysisResult,
  supportResistance: SupportResistanceResult,
): ScoreResult {
  const latest = technical.latest;
  if (!latest) {
    return {
      technicalScore: null,
      volumeScore: null,
      riskScore: null,
      reasons: ["데이터 부족"],
    };
  }

  let technicalScore = 50;
  let volumeScore = 50;
  let riskScore = 50;
  const reasons: string[] = [];

  if (latest.ma20 != null && latest.close > latest.ma20) {
    technicalScore += 5;
    reasons.push("현재가가 20일선 위에 있습니다.");
  }
  if (latest.ma60 != null && latest.close > latest.ma60) {
    technicalScore += 5;
    reasons.push("현재가가 60일선 위에 있습니다.");
  }
  if (latest.ma200 != null && latest.close > latest.ma200) {
    technicalScore += 10;
    reasons.push("현재가가 200일선 위에 있습니다.");
  }
  if (technical.points.length >= 21) {
    const previous = technical.points.at(-6);
    if (latest.ma20 != null && previous?.ma20 != null && latest.ma20 > previous.ma20) {
      technicalScore += 5;
      reasons.push("20일선이 우상향입니다.");
    }
    if (latest.ma60 != null && previous?.ma60 != null && latest.ma60 > previous.ma60) {
      technicalScore += 5;
      reasons.push("60일선이 우상향입니다.");
    }
  }
  if (latest.rsi14 != null) {
    if (latest.rsi14 >= 30 && latest.rsi14 <= 60) technicalScore += 5;
    if (latest.rsi14 >= 70) {
      technicalScore -= 5;
      riskScore += 10;
      reasons.push("RSI가 70 이상으로 과열 위험이 있습니다.");
    }
  }
  if (latest.macd != null && latest.macdSignal != null && latest.macd > latest.macdSignal) {
    technicalScore += 5;
    reasons.push("MACD가 Signal 위에 있습니다.");
  }

  if (volume.tradingValueRatio20 != null) {
    if (volume.tradingValueRatio20 >= 1.5) {
      volumeScore += 10;
      reasons.push("거래대금이 20일 평균 대비 1.5배 이상입니다.");
    }
    if (volume.isDrying) volumeScore -= 10;
  }
  if (volume.isHighAreaDistributionRisk) {
    technicalScore -= 15;
    riskScore += 20;
    reasons.push("고점권 거래대금 폭증 음봉으로 위험 신호가 있습니다.");
  }

  if (technical.high52Week != null && latest.close >= technical.high52Week * 0.95 && latest.rsi14 != null && latest.rsi14 >= 70) {
    technicalScore -= 5;
    riskScore += 10;
    reasons.push("52주 고점 근처에서 RSI 과열이 관찰됩니다.");
  }
  if (technical.low52Week != null && latest.close <= technical.low52Week * 1.1 && latest.rsi14 != null && latest.rsi14 > 30) {
    technicalScore += 5;
    reasons.push("52주 저점 근처에서 반등 가능성을 점검할 구간입니다.");
  }

  if (supportResistance.primarySupport == null) riskScore += 5;
  if (latest.atr14 != null && latest.close > 0 && latest.atr14 / latest.close >= 0.08) {
    riskScore += 15;
    reasons.push("ATR 기준 변동성이 높습니다.");
  }

  return {
    technicalScore: clampScore(technicalScore),
    volumeScore: clampScore(volumeScore),
    riskScore: clampScore(riskScore),
    reasons: reasons.slice(0, 8),
  };
}
