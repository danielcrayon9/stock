import type { Market, OhlcvPoint, Stock } from "@/lib/types";

function createDailyPoints(stockCode: string, basePrice: number, days: number): OhlcvPoint[] {
  const points: OhlcvPoint[] = [];
  const seed = Number(stockCode.slice(-3));

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    const drift = Math.sin((days - index + seed) / 11) * 0.018;
    const close = Math.round(basePrice * (1 + drift));
    const open = Math.round(close * (1 + Math.sin((days - index) / 7) * 0.004));
    const high = Math.max(open, close) + Math.round(close * 0.012);
    const low = Math.min(open, close) - Math.round(close * 0.012);
    const volume = 500_000 + ((days - index + seed) % 17) * 120_000;
    const tradingValue = close * volume;

    points.push({
      date: date.toISOString().slice(0, 10),
      open,
      high,
      low,
      close,
      volume,
      tradingValue,
    });
  }

  return points;
}

export function getSampleStock(stockCode: string): Stock | undefined {
  const samples: Record<string, Stock> = {
    "005930": { stockCode: "005930", stockName: "삼성전자(샘플)", market: "KOSPI" },
    "035720": { stockCode: "035720", stockName: "카카오(샘플)", market: "KOSPI" },
    "247540": { stockCode: "247540", stockName: "에코프로비엠(샘플)", market: "KOSDAQ" },
  };

  return samples[stockCode];
}

export function getSamplePrice(stockCode: string) {
  const stock = getSampleStock(stockCode);
  if (!stock) return null;

  const points = createDailyPoints(stockCode, stockCode === "005930" ? 72000 : 48000, 120);
  const latest = points.at(-1);
  const previous = points.at(-2);

  if (!latest) return null;

  const changeAmount = previous ? latest.close - previous.close : 0;
  const changeRate = previous && previous.close > 0 ? (changeAmount / previous.close) * 100 : 0;

  return {
    ...stock,
    currentPrice: latest.close,
    regularMarketPrice: latest.close,
    beforeMarketPrice: null,
    afterMarketPrice: null,
    priceSession: "정규장" as const,
    changeAmount,
    changeRate,
    previousClose: previous?.close ?? null,
    updatedAt: new Date().toISOString(),
    status: "sample" as const,
    message: "개발 테스트용 샘플 시세입니다. 실제 투자 판단에 사용하지 마세요.",
  };
}

export function getSampleDailyOhlcv(stockCode: string): OhlcvPoint[] {
  const stock = getSampleStock(stockCode);
  if (!stock) return [];

  const basePrice = stock.market === "KOSPI" ? 70000 : 45000;
  return createDailyPoints(stockCode, basePrice, 800);
}

export function isSampleMarketDataEnabled() {
  return process.env.USE_SAMPLE_MARKET_DATA === "true";
}

export function getSampleSearchResults(query: string, market?: Market) {
  const normalized = query.trim().toLowerCase();
  const samples = Object.values({
    "005930": { stockCode: "005930", stockName: "삼성전자(샘플)", market: "KOSPI" as const },
    "035720": { stockCode: "035720", stockName: "카카오(샘플)", market: "KOSPI" as const },
    "247540": { stockCode: "247540", stockName: "에코프로비엠(샘플)", market: "KOSDAQ" as const },
  });

  return samples.filter((stock) => {
    if (market && stock.market !== market) return false;
    return stock.stockCode.includes(normalized) || stock.stockName.toLowerCase().includes(normalized);
  });
}
