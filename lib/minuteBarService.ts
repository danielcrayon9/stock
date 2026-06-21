import { aggregateMinuteBars, normalizeMinuteBars, normalizeToFiveMinuteBars } from "@/lib/minuteBarBuilder";
import type { MinuteBar, MinuteInterval } from "@/lib/intradayTypes";
import { getWorkerMinuteBars } from "@/lib/realtimeClient";
import { generateSampleFiveMinuteBars } from "@/lib/sampleMinuteBars";

export type MinuteBarSource = "realtime-worker" | "sample";

export type MinuteBarFetchResult = {
  bars: MinuteBar[];
  interval: MinuteInterval;
  source: MinuteBarSource;
  message: string;
};

async function fetchRawBars(stockCode: string, interval: MinuteInterval): Promise<MinuteBar[] | null> {
  const direct = await getWorkerMinuteBars(stockCode, interval).catch(() => null);
  if (direct && direct.length > 0) return direct;

  if (interval !== "1m") {
    const oneMinute = await getWorkerMinuteBars(stockCode, "1m").catch(() => null);
    if (oneMinute && oneMinute.length > 0) {
      return aggregateMinuteBars(oneMinute, interval);
    }
  }

  return null;
}

/** 분봉 흐름 분석용 5분봉을 worker → 1분봉 집계 → 샘플 순으로 조회한다. */
export async function getMinuteBarsForAnalysis(
  stockCode: string,
  interval: MinuteInterval = "5m",
): Promise<MinuteBarFetchResult> {
  const raw = await fetchRawBars(stockCode, interval);

  if (raw && raw.length > 0) {
    const bars =
      interval === "5m"
        ? normalizeToFiveMinuteBars(raw)
        : normalizeMinuteBars(raw, interval);

    return {
      bars,
      interval,
      source: "realtime-worker",
      message: "realtime-worker 분봉 데이터입니다.",
    };
  }

  const sample = interval === "5m" ? generateSampleFiveMinuteBars(stockCode) : generateSampleFiveMinuteBars(stockCode);

  return {
    bars: interval === "5m" ? sample : aggregateMinuteBars(sample, interval),
    interval,
    source: "sample",
    message:
      "realtime-worker 미연결로 샘플 5분봉을 사용합니다. 실제 장중 판단에는 worker 연결 후 데이터를 사용하세요.",
  };
}
