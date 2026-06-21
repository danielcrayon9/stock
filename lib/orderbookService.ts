import type { IntradayOrderbook } from "@/lib/intradayTypes";
import { getWorkerOrderbook } from "@/lib/realtimeClient";
import { generateSampleOrderbook } from "@/lib/sampleOrderbook";

export type OrderbookSource = "realtime-worker" | "sample";

export type OrderbookFetchResult = {
  book: IntradayOrderbook;
  source: OrderbookSource;
  message: string;
};

export async function getOrderbookForAnalysis(
  stockCode: string,
  currentPrice?: number | null,
): Promise<OrderbookFetchResult> {
  const workerBook = await getWorkerOrderbook(stockCode).catch(() => null);

  if (workerBook && workerBook.bidLevels.length > 0 && workerBook.askLevels.length > 0) {
    return {
      book: workerBook,
      source: "realtime-worker",
      message: "realtime-worker 호가 데이터입니다.",
    };
  }

  return {
    book: generateSampleOrderbook(stockCode, currentPrice),
    source: "sample",
    message: "worker 미연결 — 샘플 호가로 공백·잔량을 분석합니다.",
  };
}
