import type { MinuteBar } from "@/lib/intradayTypes";
import { getWorkerVolumeContext } from "@/lib/realtimeClient";

export type VolumePersistenceContextSource = "realtime-worker" | "sample" | "estimated";

export type VolumePersistenceContext = {
  stockCode: string;
  priorDaySameTimeTradingValue: number | null;
  currentSessionTradingValue: number | null;
  /** 당일 누적 / 전일 동시간 누적 */
  sameTimeRatio: number | null;
  recent5MinTradingValue: number | null;
  prior5MinTradingValue: number | null;
  capturedAt: string;
  source: VolumePersistenceContextSource;
  message: string;
};

function patternForCode(stockCode: string): "bullish" | "neutral" | "bearish" {
  const seed = Number(stockCode.slice(-3)) % 3;
  if (stockCode === "005930") return "bullish";
  if (stockCode === "035720") return "neutral";
  if (seed === 0) return "bullish";
  if (seed === 1) return "neutral";
  return "bearish";
}

function sumTradingValue(bars: MinuteBar[]): number {
  return bars.reduce((sum, bar) => sum + bar.tradingValue, 0);
}

/** worker 미연결 시 분봉 누적치로 전일 동시간 거래대금을 추정한다. */
export function buildSampleVolumeContext(stockCode: string, bars: MinuteBar[]): VolumePersistenceContext {
  const currentSessionTradingValue = sumTradingValue(bars);
  const recent5MinTradingValue = bars.length > 0 ? bars.at(-1)!.tradingValue : null;
  const prior5MinTradingValue = bars.length > 1 ? bars.at(-2)!.tradingValue : null;

  const pattern = patternForCode(stockCode);
  const priorFactor = pattern === "bullish" ? 0.38 : pattern === "neutral" ? 0.82 : 1.15;
  const priorDaySameTimeTradingValue =
    currentSessionTradingValue > 0 ? Math.round(currentSessionTradingValue * priorFactor) : null;

  const sameTimeRatio =
    priorDaySameTimeTradingValue != null && priorDaySameTimeTradingValue > 0
      ? currentSessionTradingValue / priorDaySameTimeTradingValue
      : null;

  return {
    stockCode,
    priorDaySameTimeTradingValue,
    currentSessionTradingValue,
    sameTimeRatio,
    recent5MinTradingValue,
    prior5MinTradingValue,
    capturedAt: new Date().toISOString(),
    source: "sample",
    message: "worker 미연결 — 샘플 분봉 기반 전일 동시간 거래대금을 추정했습니다.",
  };
}

export async function getVolumePersistenceContext(
  stockCode: string,
  bars: MinuteBar[],
): Promise<VolumePersistenceContext> {
  const workerContext = await getWorkerVolumeContext(stockCode).catch(() => null);
  if (workerContext && workerContext.sameTimeRatio != null) {
    return workerContext;
  }

  if (bars.length === 0) {
    return {
      stockCode,
      priorDaySameTimeTradingValue: null,
      currentSessionTradingValue: null,
      sameTimeRatio: null,
      recent5MinTradingValue: null,
      prior5MinTradingValue: null,
      capturedAt: new Date().toISOString(),
      source: "estimated",
      message: "분봉 데이터 없음 — 거래대금 지속성 컨텍스트를 만들 수 없습니다.",
    };
  }

  return buildSampleVolumeContext(stockCode, bars);
}
