import type { Market } from "@/lib/types";
import type { MarketIndexSnapshot } from "@/lib/intradayTypes";

export type MarketBreadth = {
  risingStockCount: number;
  fallingStockCount: number;
  unchangedStockCount?: number;
};

export type MarketIndexContextSource = "realtime-worker" | "sample";

export type MarketIndexContext = {
  indexes: MarketIndexSnapshot[];
  breadth: MarketBreadth | null;
  /** 전일 대비 시장 전체 거래대금 변화율(%) */
  marketTradingValueChangeRate: number | null;
  capturedAt: string;
  source: MarketIndexContextSource;
  message: string;
};

function directionFromChangeRate(changeRate: number | null): MarketIndexSnapshot["direction"] {
  if (changeRate == null) return "데이터 부족";
  if (changeRate > 0.05) return "상승";
  if (changeRate < -0.05) return "하락";
  return "중립";
}

function indexSnapshot(
  indexCode: string,
  indexName: string,
  currentValue: number,
  changeRate: number,
  capturedAt: string,
): MarketIndexSnapshot {
  return {
    indexCode,
    indexName,
    currentValue,
    changeRate,
    direction: directionFromChangeRate(changeRate),
    capturedAt,
  };
}

/** worker 미연결 시 UI·점수 검증용 시장 지수 샘플 */
export function generateSampleMarketContext(): MarketIndexContext {
  const capturedAt = new Date().toISOString();

  return {
    indexes: [
      indexSnapshot("KOSPI", "KOSPI", 2650.12, 0.42, capturedAt),
      indexSnapshot("KOSDAQ", "KOSDAQ", 845.33, 0.28, capturedAt),
      indexSnapshot("KOSPI200", "KOSPI 200", 358.45, 0.55, capturedAt),
      indexSnapshot("KOSDAQ150", "KOSDAQ 150", 1120.8, 0.31, capturedAt),
      indexSnapshot("SECTOR_SEMI", "반도체", 412.6, 0.61, capturedAt),
      indexSnapshot("SECTOR_IT", "IT", 198.2, -0.12, capturedAt),
      indexSnapshot("SECTOR_BIO", "바이오", 156.4, 0.33, capturedAt),
    ],
    breadth: {
      risingStockCount: 528,
      fallingStockCount: 372,
      unchangedStockCount: 100,
    },
    marketTradingValueChangeRate: 8.5,
    capturedAt,
    source: "sample",
    message: "worker 미연결 — 샘플 시장 지수·breadth 데이터입니다.",
  };
}

/** 종목코드 기준 업종 지수 코드 추정 (샘플/worker 공통 fallback) */
export function resolveSectorIndexCode(stockCode: string, market: Market): string {
  if (stockCode === "005930") return "SECTOR_SEMI";
  if (stockCode === "035720") return "SECTOR_IT";
  if (stockCode === "247540") return "SECTOR_BIO";
  if (market === "KOSDAQ") return "KOSDAQ150";
  return "KOSPI200";
}

export function findIndex(context: MarketIndexContext, indexCode: string): MarketIndexSnapshot | null {
  return context.indexes.find((item) => item.indexCode === indexCode) ?? null;
}
