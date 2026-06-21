import type { IntradayOrderbook } from "@/lib/intradayTypes";

export type OrderbookGapResult = {
  score: number | null;
  summary: string;
  signals: string[];
};

function sumQuantity(levels: { quantity: number }[]) {
  return levels.reduce((acc, item) => acc + item.quantity, 0);
}

export function analyzeOrderbookGap(book: IntradayOrderbook | null): OrderbookGapResult {
  if (!book) {
    return { score: null, summary: "호가 데이터 부족", signals: ["호가 worker 연결 필요"] };
  }

  const ask5 = sumQuantity(book.askLevels.slice(0, 5));
  const bid5 = sumQuantity(book.bidLevels.slice(0, 5));
  const bidSupport = bid5 > ask5;
  const spreadOk = book.spreadRate == null || book.spreadRate < 0.5;
  const score = (bidSupport ? 10 : 0) + (spreadOk ? 5 : -15);

  return {
    score,
    summary: `상위 5호가 매수/매도 잔량 기준 점수 ${score}점`,
    signals: [bidSupport ? "하방 매수잔량 우위" : "상방 매도잔량 부담", spreadOk ? "스프레드 양호" : "스프레드 과다"],
  };
}
