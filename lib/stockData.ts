import { findStockByCode, getYahooSymbol, KOREAN_STOCKS } from "@/config/markets";
import type { Market, OhlcvPoint, Stock, StockPriceQuote } from "@/lib/types";
import {
  getSampleDailyOhlcv,
  getSamplePrice,
  getSampleSearchResults,
  isSampleMarketDataEnabled,
} from "@/lib/sampleMarketData";

type YahooChartResult = {
  meta?: {
    regularMarketPrice?: number;
    preMarketPrice?: number;
    preMarketTime?: number;
    postMarketPrice?: number;
    postMarketTime?: number;
    chartPreviousClose?: number;
    regularMarketTime?: number;
    currency?: string;
    symbol?: string;
  };
  timestamp?: number[];
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>;
      high?: Array<number | null>;
      low?: Array<number | null>;
      close?: Array<number | null>;
      volume?: Array<number | null>;
    }>;
  };
};

type YahooChartResponse = {
  chart?: {
    result?: YahooChartResult[];
    error?: { description?: string };
  };
};

const DATA_UNAVAILABLE_MESSAGE =
  "시세 데이터 연결 필요. MARKET_DATA_PROVIDER 설정 또는 USE_SAMPLE_MARKET_DATA=true(개발용)를 확인하세요.";

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function resolveStock(stockCode: string, market?: Market): Stock {
  const known = findStockByCode(stockCode);
  if (known) return known;

  return {
    stockCode,
    stockName: stockCode,
    market: market ?? "UNKNOWN",
  };
}

async function fetchYahooChart(stock: Stock, range = "10y") {
  const symbol = getYahooSymbol(stock.stockCode, stock.market);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance 응답 오류 (${response.status})`);
  }

  const payload = (await response.json()) as YahooChartResponse;
  const result = payload.chart?.result?.[0];
  if (!result) {
    throw new Error(payload.chart?.error?.description ?? "Yahoo Finance 데이터가 비어 있습니다.");
  }

  return result;
}

function validPrice(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function pickDisplayPrice(meta: YahooChartResult["meta"]) {
  const regularMarketPrice = validPrice(meta?.regularMarketPrice);
  const beforeMarketPrice = validPrice(meta?.preMarketPrice);
  const afterMarketPrice = validPrice(meta?.postMarketPrice);
  const candidates = [
    {
      price: afterMarketPrice,
      session: "장후" as const,
      time: meta?.postMarketTime ?? 0,
    },
    {
      price: beforeMarketPrice,
      session: "장전" as const,
      time: meta?.preMarketTime ?? 0,
    },
    {
      price: regularMarketPrice,
      session: "정규장" as const,
      time: meta?.regularMarketTime ?? 0,
    },
  ]
    .filter((item) => item.price != null)
    .sort((left, right) => right.time - left.time);

  const selected = candidates[0] ?? null;
  return {
    currentPrice: selected?.price ?? null,
    priceSession: selected?.session ?? ("데이터 부족" as const),
    regularMarketPrice,
    beforeMarketPrice,
    afterMarketPrice,
    updatedAt:
      selected?.time != null && selected.time > 0
        ? new Date(selected.time * 1000).toISOString()
        : null,
  };
}

function mapYahooDailyPoints(result: YahooChartResult): OhlcvPoint[] {
  const timestamps = result.timestamp ?? [];
  const quote = result.indicators?.quote?.[0];
  if (!quote) return [];

  const points: OhlcvPoint[] = [];

  timestamps.forEach((timestamp, index) => {
    const open = quote.open?.[index];
    const high = quote.high?.[index];
    const low = quote.low?.[index];
    const close = quote.close?.[index];
    const volume = quote.volume?.[index];

    if (
      open == null ||
      high == null ||
      low == null ||
      close == null ||
      volume == null ||
      Number.isNaN(open) ||
      Number.isNaN(high) ||
      Number.isNaN(low) ||
      Number.isNaN(close) ||
      Number.isNaN(volume)
    ) {
      return;
    }

    points.push({
      date: new Date(timestamp * 1000).toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
      tradingValue: close * volume,
    });
  });

  return points;
}

export async function searchStocks(query: string, market?: Market): Promise<Stock[]> {
  const normalized = normalizeQuery(query);
  if (!normalized) return [];

  const localMatches = KOREAN_STOCKS.filter((stock) => {
    if (market && stock.market !== market) return false;
    return (
      stock.stockCode.includes(normalized) ||
      stock.stockName.toLowerCase().includes(normalized)
    );
  });

  if (localMatches.length > 0) {
    return localMatches.slice(0, 20);
  }

  if (isSampleMarketDataEnabled()) {
    return getSampleSearchResults(query, market);
  }

  return [];
}

export async function getStockPrice(stockCode: string, market?: Market): Promise<StockPriceQuote | null> {
  const stock = resolveStock(stockCode, market);

  if (isSampleMarketDataEnabled()) {
    const sample = getSamplePrice(stockCode);
    if (sample) return sample;
  }

  try {
    const result = await fetchYahooChart(stock, "5d");
    const meta = result.meta;
    const {
      currentPrice,
      priceSession,
      regularMarketPrice,
      beforeMarketPrice,
      afterMarketPrice,
      updatedAt,
    } = pickDisplayPrice(meta);
    const previousClose = meta?.chartPreviousClose ?? null;
    const changeAmount =
      currentPrice != null && previousClose != null ? currentPrice - previousClose : null;
    const changeRate =
      changeAmount != null && previousClose != null && previousClose !== 0
        ? (changeAmount / previousClose) * 100
        : null;

    if (currentPrice == null) {
      return {
        ...stock,
        currentPrice: null,
        regularMarketPrice,
        beforeMarketPrice,
        afterMarketPrice,
        priceSession: "데이터 부족",
        changeAmount: null,
        changeRate: null,
        previousClose: null,
        updatedAt: null,
        status: "data-unavailable",
        message: DATA_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      ...stock,
      currentPrice,
      regularMarketPrice,
      beforeMarketPrice,
      afterMarketPrice,
      priceSession,
      changeAmount,
      changeRate,
      previousClose,
      updatedAt: updatedAt ?? new Date().toISOString(),
      status: "ready",
      message: `Yahoo Finance chart API 기준 ${priceSession} 가격입니다.`,
    };
  } catch {
    return {
      ...stock,
      currentPrice: null,
      regularMarketPrice: null,
      beforeMarketPrice: null,
      afterMarketPrice: null,
      priceSession: "데이터 부족",
      changeAmount: null,
      changeRate: null,
      previousClose: null,
      updatedAt: null,
      status: "data-unavailable",
      message: DATA_UNAVAILABLE_MESSAGE,
    };
  }
}

export async function getDailyOhlcv(stockCode: string, market?: Market) {
  const stock = resolveStock(stockCode, market);

  if (isSampleMarketDataEnabled()) {
    const points = getSampleDailyOhlcv(stockCode);
    if (points.length > 0) {
      return {
        stockCode,
        period: "daily" as const,
        points,
        status: "sample" as const,
        message: "개발 테스트용 샘플 OHLCV입니다.",
      };
    }
  }

  try {
    const result = await fetchYahooChart(stock, "10y");
    const points = mapYahooDailyPoints(result);

    if (points.length === 0) {
      return {
        stockCode,
        period: "daily" as const,
        points: [],
        status: "data-unavailable" as const,
        message: DATA_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      stockCode,
      period: "daily" as const,
      points,
      status: "ready" as const,
      message: "Yahoo Finance chart API 기준 일봉 데이터입니다.",
    };
  } catch {
    return {
      stockCode,
      period: "daily" as const,
      points: [],
      status: "data-unavailable" as const,
      message: DATA_UNAVAILABLE_MESSAGE,
    };
  }
}
