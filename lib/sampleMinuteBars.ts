import type { MinuteBar } from "@/lib/intradayTypes";
import { enrichWithVwapAndMa20 } from "@/lib/minuteBarBuilder";

type Pattern = "bullish" | "neutral" | "bearish";

function patternForCode(stockCode: string): Pattern {
  const seed = Number(stockCode.slice(-3)) % 3;
  if (stockCode === "005930") return "bullish";
  if (stockCode === "035720") return "neutral";
  if (seed === 0) return "bullish";
  if (seed === 1) return "neutral";
  return "bearish";
}

function sessionStartIso(barCount: number): Date {
  const now = new Date();
  return new Date(now.getTime() - barCount * 5 * 60 * 1000);
}

/** worker 미연결 시 UI·점수 검증용 5분봉 샘플 (실제 매매 판단에 사용하지 않음). */
export function generateSampleFiveMinuteBars(stockCode: string, barCount = 48): MinuteBar[] {
  const pattern = patternForCode(stockCode);
  const seed = Number(stockCode.slice(-4)) || 1000;
  const basePrice = stockCode === "005930" ? 72000 : stockCode === "035720" ? 48000 : 30000 + (seed % 500) * 10;
  const start = sessionStartIso(barCount);

  const raw: MinuteBar[] = [];

  for (let index = 0; index < barCount; index += 1) {
    const timestamp = new Date(start.getTime() + index * 5 * 60 * 1000).toISOString();
    const drift =
      pattern === "bullish"
        ? index * 0.0018 + Math.sin(index / 4) * 0.002
        : pattern === "bearish"
          ? -index * 0.0012 + Math.sin(index / 5) * 0.0015
          : Math.sin(index / 6) * 0.002;

    const close = Math.round(basePrice * (1 + drift));
    const open = Math.round(close * (1 + Math.sin((index + seed) / 7) * 0.003));
    const high = Math.max(open, close) + Math.round(close * (pattern === "bullish" ? 0.004 : 0.003));
    const low = Math.min(open, close) - Math.round(close * (pattern === "bearish" ? 0.004 : 0.003));
    const volume = 80_000 + ((index + seed) % 13) * 12_000 + (pattern === "bullish" && index > barCount - 8 ? 40_000 : 0);

    raw.push({
      stockCode,
      interval: "5m",
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      tradingValue: close * volume,
      vwap: null,
      ma20: null,
    });
  }

  // 장대양봉 + 거래량 유지 패턴 (bullish 샘플)
  if (pattern === "bullish" && raw.length >= 10) {
    const spikeIndex = raw.length - 8;
    const base = raw[spikeIndex];
    const bigGreenClose = Math.round(base.close * 1.025);
    const bigGreenOpen = base.open;
    raw[spikeIndex] = {
      ...base,
      close: bigGreenClose,
      high: bigGreenClose + Math.round(bigGreenClose * 0.003),
      low: Math.min(bigGreenOpen, base.low),
      open: bigGreenOpen,
      volume: base.volume * 2.2,
      tradingValue: bigGreenClose * base.volume * 2.2,
    };
    for (let follow = 1; follow <= 2; follow += 1) {
      const next = raw[spikeIndex + follow];
      if (!next) continue;
      raw[spikeIndex + follow] = {
        ...next,
        volume: Math.round(raw[spikeIndex].volume * 0.85),
        tradingValue: next.close * Math.round(raw[spikeIndex].volume * 0.85),
      };
    }
  }

  // 최근 3봉 저점/고점 상승 + 15분 거래대금 증가 (bullish)
  if (pattern === "bullish" && raw.length >= 3) {
    for (let index = raw.length - 3; index < raw.length; index += 1) {
      const step = index - (raw.length - 3);
      const bump = (step + 1) * 180;
      const bar = raw[index];
      const volumeBoost = 1 + step * 0.25;
      raw[index] = {
        ...bar,
        low: bar.low + bump,
        high: bar.high + bump + 120,
        close: bar.close + bump + 80,
        open: bar.open + bump,
        volume: Math.round(bar.volume * volumeBoost),
        tradingValue: Math.round((bar.close + bump + 80) * bar.volume * volumeBoost),
      };
    }
  }

  return enrichWithVwapAndMa20(raw);
}
