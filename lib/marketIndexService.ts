import type { MarketIndexContext } from "@/lib/sampleMarketIndexes";
import { generateSampleMarketContext } from "@/lib/sampleMarketIndexes";
import type { MarketIndexSnapshot } from "@/lib/intradayTypes";
import { getMarketIndex as getKisMarketIndex } from "@/lib/kisClient";
import { isKisConfigured } from "@/lib/kisToken";
import { getWorkerMarketContext, getWorkerMarketIndex } from "@/lib/realtimeClient";

const DEFAULT_INDEX_CODES = ["KOSPI", "KOSDAQ", "KOSPI200", "KOSDAQ150", "SECTOR_SEMI", "SECTOR_IT", "SECTOR_BIO"];
const KIS_INDEX_CODES = ["KOSPI", "KOSDAQ", "KOSPI200"];

function mapKisDirection(change: number): MarketIndexSnapshot["direction"] {
  if (change > 0) return "상승";
  if (change < 0) return "하락";
  return "중립";
}

async function fetchKisIndexes(): Promise<MarketIndexSnapshot[]> {
  const results = await Promise.all(
    KIS_INDEX_CODES.map(async (code) => {
      try {
        const index = await getKisMarketIndex(code);
        if (!index) return null;
        const snapshot: MarketIndexSnapshot = {
          indexCode: index.indexCode,
          indexName: index.indexCode,
          currentValue: index.currentValue,
          changeRate: index.changeRate,
          direction: mapKisDirection(index.change),
          capturedAt: index.updatedAt,
        };
        return snapshot;
      } catch {
        return null;
      }
    }),
  );

  return results.filter((item): item is MarketIndexSnapshot => item !== null);
}

async function fetchWorkerIndexes(): Promise<MarketIndexSnapshot[]> {
  const results = await Promise.all(
    DEFAULT_INDEX_CODES.map((code) => getWorkerMarketIndex(code).catch(() => null)),
  );
  return results.filter((item): item is MarketIndexSnapshot => item != null);
}

export async function getMarketIndexContext(): Promise<MarketIndexContext> {
  if (isKisConfigured()) {
    try {
      const kisIndexes = await fetchKisIndexes();
      if (kisIndexes.length >= 2) {
        return {
          indexes: kisIndexes,
          breadth: null,
          marketTradingValueChangeRate: null,
          capturedAt: new Date().toISOString(),
          source: "KIS",
          message: "KIS API 기준 시장 지수입니다.",
        };
      }
    } catch {
      // fallback
    }
  }

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
