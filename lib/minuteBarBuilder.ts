import type { MinuteBar, MinuteInterval } from "@/lib/intradayTypes";

const INTERVAL_MINUTES: Record<MinuteInterval, number> = {
  "1m": 1,
  "3m": 3,
  "5m": 5,
  "15m": 15,
};

export function bucketTimestamp(iso: string, intervalMinutes: number): number {
  const ms = new Date(iso).getTime();
  const bucketMs = intervalMinutes * 60 * 1000;
  return Math.floor(ms / bucketMs) * bucketMs;
}

export function aggregateMinuteBars(bars: MinuteBar[], targetInterval: MinuteInterval): MinuteBar[] {
  if (bars.length === 0) return [];

  const minutes = INTERVAL_MINUTES[targetInterval];
  const sorted = [...bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  if (sorted.every((bar) => bar.interval === targetInterval)) {
    return sorted.map((bar) => ({ ...bar }));
  }

  const buckets = new Map<number, MinuteBar[]>();

  for (const bar of sorted) {
    const key = bucketTimestamp(bar.timestamp, minutes);
    const group = buckets.get(key) ?? [];
    group.push(bar);
    buckets.set(key, group);
  }

  const result: MinuteBar[] = [];
  for (const [key, group] of [...buckets.entries()].sort((a, b) => a[0] - b[0])) {
    const first = group[0];
    result.push({
      stockCode: first.stockCode,
      interval: targetInterval,
      timestamp: new Date(key).toISOString(),
      open: group[0].open,
      high: Math.max(...group.map((item) => item.high)),
      low: Math.min(...group.map((item) => item.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum, item) => sum + item.volume, 0),
      tradingValue: group.reduce((sum, item) => sum + item.tradingValue, 0),
      vwap: null,
      ma20: null,
    });
  }

  return result;
}

/** 세션 시작부터 누적 VWAP과 종가 기준 20MA를 각 봉에 부여한다. */
export function enrichWithVwapAndMa20(bars: MinuteBar[]): MinuteBar[] {
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;
  const closes: number[] = [];

  return bars.map((bar) => {
    const typical = (bar.high + bar.low + bar.close) / 3;
    cumulativeTypicalVolume += typical * bar.volume;
    cumulativeVolume += bar.volume;
    const vwap = cumulativeVolume > 0 ? cumulativeTypicalVolume / cumulativeVolume : null;

    closes.push(bar.close);
    const window = closes.slice(-20);
    const ma20 = window.length >= 20 ? window.reduce((sum, value) => sum + value, 0) / 20 : null;

    return { ...bar, vwap, ma20 };
  });
}

/** 입력 봉을 5분봉으로 정규화하고 VWAP·20MA를 계산한다. */
export function normalizeToFiveMinuteBars(bars: MinuteBar[]): MinuteBar[] {
  if (bars.length === 0) return [];

  const sourceInterval = bars[0].interval;
  const fiveMinute =
    sourceInterval === "5m" ? [...bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp)) : aggregateMinuteBars(bars, "5m");

  return enrichWithVwapAndMa20(fiveMinute);
}

export function normalizeMinuteBars(bars: MinuteBar[], interval: MinuteInterval): MinuteBar[] {
  if (bars.length === 0) return [];

  const aggregated =
    bars[0].interval === interval
      ? [...bars].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      : aggregateMinuteBars(bars, interval);

  return interval === "5m" ? enrichWithVwapAndMa20(aggregated) : aggregated;
}
