import type { MarketIndexSnapshot } from "@/lib/intradayTypes";

export type MarketIndexAnalysisResult = {
  score: number | null;
  summary: string;
  signals: string[];
};

export function analyzeMarketIndexes(indexes: MarketIndexSnapshot[]): MarketIndexAnalysisResult {
  if (indexes.length === 0) {
    return { score: null, summary: "시장 지수 데이터 부족", signals: ["지수 worker 연결 필요"] };
  }

  const rising = indexes.filter((item) => (item.changeRate ?? 0) > 0).length;
  const falling = indexes.filter((item) => (item.changeRate ?? 0) < 0).length;
  const score = rising > falling ? 10 : falling > rising ? -20 : 0;

  return {
    score,
    summary: rising > falling ? "주요 지수 상승 우위" : falling > rising ? "주요 지수 하락 우위" : "시장 방향 중립",
    signals: indexes.map((item) => `${item.indexName}: ${item.direction}`),
  };
}
