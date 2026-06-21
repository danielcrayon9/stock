import type { MarketIndexContext } from "@/lib/sampleMarketIndexes";
import { generateSampleMarketContext } from "@/lib/sampleMarketIndexes";
import type { MarketIndexSnapshot } from "@/lib/intradayTypes";
import { getWorkerMarketContext, getWorkerMarketIndex } from "@/lib/realtimeClient";

const DEFAULT_INDEX_CODES = ["KOSPI", "KOSDAQ", "KOSPI200", "KOSDAQ150", "SECTOR_SEMI", "SECTOR_IT", "SECTOR_BIO"];

async function fetchWorkerIndexes(): Promise<MarketIndexSnapshot[]> {
  const results = await Promise.all(
    DEFAULT_INDEX_CODES.map((code) => getWorkerMarketIndex(code).catch(() => null)),
  );
  return results.filter((item): item is MarketIndexSnapshot => item != null);
}

export async function getMarketIndexContext(): Promise<MarketIndexContext> {
  const workerContext = await getWorkerMarketContext().catch(() => null);
  if (workerContext && workerContext.indexes.length > 0) {
    return workerContext;
  }

  const indexes = await fetchWorkerIndexes();
  if (indexes.length >= 2) {
    return {
      indexes,
      breadth: null,
      marketTradingValueChangeRate: null,
      capturedAt: new Date().toISOString(),
      source: "realtime-worker",
      message: "realtime-worker 개별 지수 조회 결과입니다.",
    };
  }

  return generateSampleMarketContext();
}
