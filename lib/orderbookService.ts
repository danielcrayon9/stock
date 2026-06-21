import type { IntradayOrderbook } from "@/lib/intradayTypes";
import { getOrderbook as getKisOrderbook } from "@/lib/kisClient";
import { isKisConfigured } from "@/lib/kisToken";
import { getWorkerOrderbook } from "@/lib/realtimeClient";
import { generateSampleOrderbook } from "@/lib/sampleOrderbook";

export type OrderbookSource = "KIS" | "realtime-worker" | "sample";

export type OrderbookFetchResult = {
  book: IntradayOrderbook;
  source: OrderbookSource;
  message: string;
  orderbookAvailable?: boolean;
  spread?: number | null;
  totalAskVolume?: number;
  totalBidVolume?: number;
};

function mapKisToIntradayBook(
  stockCode: string,
  kis: NonNullable<Awaited<ReturnType<typeof getKisOrderbook>>>,
): IntradayOrderbook {
  const bestAsk = kis.asks[0]?.price ?? null;
  const bestBid = kis.bids[0]?.price ?? null;
  const spreadRate =
    bestAsk != null && bestBid != null && bestBid > 0
      ? ((bestAsk - bestBid) / bestBid) * 100
      : null;

  return {
    stockCode,
    bidLevels: kis.bids.map((item) => ({ price: item.price, quantity: item.volume })),
    askLevels: kis.asks.map((item) => ({ price: item.price, quantity: item.volume })),
    spreadRate,
    tradeStrength: null,
    capturedAt: kis.updatedAt,
  };
}

export async function getOrderbookForAnalysis(
  stockCode: string,
  currentPrice?: number | null,
): Promise<OrderbookFetchResult> {
  if (isKisConfigured()) {
    try {
      const kis = await getKisOrderbook(stockCode);
      if (kis?.orderbookAvailable) {
        return {
          book: mapKisToIntradayBook(stockCode, kis),
          source: "KIS",
          message: "KIS API 호가 데이터입니다.",
          orderbookAvailable: true,
          spread: kis.spread,
          totalAskVolume: kis.totalAskVolume,
          totalBidVolume: kis.totalBidVolume,
        };
      }
    } catch {
      // fallback
    }
  }

  const workerBook = await getWorkerOrderbook(stockCode).catch(() => null);

  if (workerBook && workerBook.bidLevels.length > 0 && workerBook.askLevels.length > 0) {
    return {
      book: workerBook,
      source: "realtime-worker",
      message: "realtime-worker 호가 데이터입니다.",
      orderbookAvailable: true,
    };
  }

  return {
    book: generateSampleOrderbook(stockCode, currentPrice),
    source: "sample",
    message: "KIS/worker 미연결 — 샘플 호가로 공백·잔량을 분석합니다.",
    orderbookAvailable: false,
  };
}
