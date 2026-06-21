import type { MinuteBar } from "@/lib/intradayTypes";

export type MinuteFlowResult = {
  score: number | null;
  summary: string;
  signals: string[];
};

export function analyzeMinuteFlow(bars: MinuteBar[]): MinuteFlowResult {
  if (bars.length < 3) {
    return { score: null, summary: "분봉 데이터 부족", signals: ["분봉 데이터 부족"] };
  }

  const latest = bars.at(-1)!;
  const scoreParts = [
    latest.vwap != null && latest.close > latest.vwap ? 10 : 0,
    latest.ma20 != null && latest.close > latest.ma20 ? 10 : 0,
  ];
  const score = scoreParts.reduce((acc, value) => acc + value, 0);

  return {
    score,
    summary: `VWAP/20MA 기준 분봉 흐름 점수 ${score}점`,
    signals: [
      latest.vwap != null && latest.close > latest.vwap ? "VWAP 위" : "VWAP 확인 필요",
      latest.ma20 != null && latest.close > latest.ma20 ? "5분봉 20MA 위" : "5분봉 20MA 확인 필요",
    ],
  };
}
