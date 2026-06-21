import type { MinuteBar } from "@/lib/intradayTypes";

export type VolumePersistenceResult = {
  score: number | null;
  summary: string;
  signals: string[];
};

export function analyzeVolumePersistence(bars: MinuteBar[]): VolumePersistenceResult {
  if (bars.length < 6) {
    return { score: null, summary: "거래대금 지속성 데이터 부족", signals: ["분봉 누적 필요"] };
  }

  const recent = bars.slice(-3).reduce((acc, item) => acc + item.tradingValue, 0);
  const previous = bars.slice(-6, -3).reduce((acc, item) => acc + item.tradingValue, 0);
  const increasing = previous > 0 && recent > previous;
  const priceUp = bars.at(-1)!.close > bars.at(-6)!.close;
  const score = (increasing ? 10 : 0) + (increasing && priceUp ? 15 : 0);

  return {
    score,
    summary: increasing ? "최근 거래대금이 직전 구간 대비 유지/증가 중입니다." : "거래대금 지속성 확인이 필요합니다.",
    signals: [increasing ? "최근 거래대금 증가" : "최근 거래대금 둔화", priceUp ? "가격 상승 동반" : "가격 상승 약함"],
  };
}
