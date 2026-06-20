import type { OhlcvPoint, TechnicalAnalysisResult, TechnicalIndicatorPoint } from "@/lib/types";

function round(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function movingAverage(values: number[], index: number, window: number) {
  if (index + 1 < window) return null;
  return average(values.slice(index + 1 - window, index + 1));
}

function exponentialMovingAverage(values: number[], window: number) {
  const multiplier = 2 / (window + 1);
  const output: Array<number | null> = Array(values.length).fill(null);
  let previous: number | null = null;

  values.forEach((value, index) => {
    if (index + 1 < window) return;

    if (previous == null) {
      previous = average(values.slice(index + 1 - window, index + 1));
    } else {
      previous = (value - previous) * multiplier + previous;
    }

    output[index] = previous;
  });

  return output;
}

function rsi(values: number[], window = 14) {
  const output: Array<number | null> = Array(values.length).fill(null);

  for (let index = window; index < values.length; index += 1) {
    const changes = values.slice(index + 1 - window, index + 1).map((value, changeIndex, sliced) => {
      if (changeIndex === 0) return value - values[index - window];
      return value - sliced[changeIndex - 1];
    });
    const gains = changes.filter((change) => change > 0);
    const losses = changes.filter((change) => change < 0).map(Math.abs);
    const averageGain = average(gains) ?? 0;
    const averageLoss = average(losses) ?? 0;

    if (averageLoss === 0) {
      output[index] = averageGain === 0 ? 50 : 100;
    } else {
      const relativeStrength = averageGain / averageLoss;
      output[index] = 100 - 100 / (1 + relativeStrength);
    }
  }

  return output;
}

function atr(points: OhlcvPoint[], window = 14) {
  const trueRanges = points.map((point, index) => {
    const previousClose = points[index - 1]?.close ?? point.close;
    return Math.max(
      point.high - point.low,
      Math.abs(point.high - previousClose),
      Math.abs(point.low - previousClose),
    );
  });

  return trueRanges.map((_, index) => movingAverage(trueRanges, index, window));
}

function bollinger(values: number[], index: number, window = 20) {
  if (index + 1 < window) return { middle: null, upper: null, lower: null };

  const slice = values.slice(index + 1 - window, index + 1);
  const middle = average(slice);
  if (middle == null) return { middle: null, upper: null, lower: null };

  const variance = average(slice.map((value) => (value - middle) ** 2));
  if (variance == null) return { middle, upper: null, lower: null };

  const deviation = Math.sqrt(variance);
  return {
    middle,
    upper: middle + deviation * 2,
    lower: middle - deviation * 2,
  };
}

function createTrend(latest: TechnicalIndicatorPoint | null, label: string) {
  if (!latest || latest.ma20 == null || latest.ma60 == null) {
    return {
      label,
      trend: "데이터 부족" as const,
      summary: `${label}: 이동평균 계산에 필요한 데이터가 부족합니다.`,
    };
  }

  if (latest.close > latest.ma20 && latest.ma20 > latest.ma60) {
    return {
      label,
      trend: "상승" as const,
      summary: `${label}: 종가가 20/60 이동평균 위에 있어 상승 흐름입니다.`,
    };
  }

  if (latest.close < latest.ma20 && latest.ma20 < latest.ma60) {
    return {
      label,
      trend: "하락" as const,
      summary: `${label}: 종가가 주요 이동평균 아래에 있어 약세 흐름입니다.`,
    };
  }

  return {
    label,
    trend: "중립" as const,
    summary: `${label}: 이동평균 배열이 혼재되어 중립 구간입니다.`,
  };
}

function findRecentExtreme(points: OhlcvPoint[], kind: "high" | "low") {
  if (points.length < 20) return null;
  const recent = points.slice(-60, -1);
  if (recent.length === 0) return null;
  return kind === "high"
    ? Math.max(...recent.map((point) => point.high))
    : Math.min(...recent.map((point) => point.low));
}

export function analyzeTechnical(points: OhlcvPoint[], label = "현재 봉"): TechnicalAnalysisResult {
  if (points.length < 20) {
    return {
      points: [],
      latest: null,
      trend: {
        label,
        trend: "데이터 부족",
        summary: `${label}: 기술적 분석에는 최소 20개 이상의 봉 데이터가 필요합니다.`,
      },
      high52Week: null,
      low52Week: null,
      previousHigh: null,
      previousLow: null,
      signals: ["데이터 부족"],
      message: "기술적 분석 데이터 부족",
    };
  }

  const closes = points.map((point) => point.close);
  const volumes = points.map((point) => point.volume);
  const tradingValues = points.map((point) => point.tradingValue);
  const rsi14 = rsi(closes, 14);
  const ema12 = exponentialMovingAverage(closes, 12);
  const ema26 = exponentialMovingAverage(closes, 26);
  const macdLine = closes.map((_, index) =>
    ema12[index] != null && ema26[index] != null ? (ema12[index] as number) - (ema26[index] as number) : null,
  );
  const macdValues = macdLine.map((value) => value ?? 0);
  const macdSignal = exponentialMovingAverage(macdValues, 9).map((value, index) =>
    macdLine[index] == null ? null : value,
  );
  const atr14 = atr(points, 14);

  const enriched = points.map((point, index): TechnicalIndicatorPoint => {
    const bands = bollinger(closes, index, 20);
    const macd = macdLine[index];
    const signal = macdSignal[index];

    return {
      ...point,
      ma5: round(movingAverage(closes, index, 5)),
      ma20: round(movingAverage(closes, index, 20)),
      ma60: round(movingAverage(closes, index, 60)),
      ma120: round(movingAverage(closes, index, 120)),
      ma200: round(movingAverage(closes, index, 200)),
      rsi14: round(rsi14[index]),
      macd: round(macd),
      macdSignal: round(signal),
      macdHistogram: round(macd != null && signal != null ? macd - signal : null),
      bollingerUpper: round(bands.upper),
      bollingerMiddle: round(bands.middle),
      bollingerLower: round(bands.lower),
      atr14: round(atr14[index]),
      volumeMa20: round(movingAverage(volumes, index, 20), 0),
      tradingValueMa20: round(movingAverage(tradingValues, index, 20), 0),
    };
  });

  const latest = enriched.at(-1) ?? null;
  const lastYear = points.slice(-260);
  const high52Week = lastYear.length >= 60 ? Math.max(...lastYear.map((point) => point.high)) : null;
  const low52Week = lastYear.length >= 60 ? Math.min(...lastYear.map((point) => point.low)) : null;
  const signals: string[] = [];

  if (latest?.rsi14 != null) {
    if (latest.rsi14 >= 70) signals.push("RSI 70 이상으로 단기 과열 가능성이 있습니다.");
    else if (latest.rsi14 <= 30) signals.push("RSI 30 이하로 과매도 구간입니다.");
    else signals.push("RSI가 과열/과매도 극단 구간은 아닙니다.");
  }

  if (latest?.macd != null && latest.macdSignal != null) {
    signals.push(latest.macd > latest.macdSignal ? "MACD가 Signal 위에 있습니다." : "MACD가 Signal 아래에 있습니다.");
  }

  return {
    points: enriched,
    latest,
    trend: createTrend(latest, label),
    high52Week,
    low52Week,
    previousHigh: findRecentExtreme(points, "high"),
    previousLow: findRecentExtreme(points, "low"),
    signals,
    message: "기술적 분석 계산 완료",
  };
}
