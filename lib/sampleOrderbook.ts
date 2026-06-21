import type { IntradayOrderbook, OrderbookLevel } from "@/lib/intradayTypes";

type Pattern = "bullish" | "neutral" | "bearish";

function patternForCode(stockCode: string): Pattern {
  const seed = Number(stockCode.slice(-3)) % 3;
  if (stockCode === "005930") return "bullish";
  if (stockCode === "035720") return "neutral";
  if (seed === 0) return "bullish";
  if (seed === 1) return "neutral";
  return "bearish";
}

function defaultPrice(stockCode: string): number {
  if (stockCode === "005930") return 72000;
  if (stockCode === "035720") return 48000;
  return 30000 + (Number(stockCode.slice(-3)) % 500) * 10;
}

function buildLevels(
  basePrice: number,
  side: "bid" | "ask",
  pattern: Pattern,
): OrderbookLevel[] {
  const tick = basePrice >= 50000 ? 100 : 50;
  const levels: OrderbookLevel[] = [];

  for (let index = 0; index < 10; index += 1) {
    const price =
      side === "bid"
        ? basePrice - tick * (index + 1)
        : basePrice + tick * (index + 1);

    let quantity: number;
    if (pattern === "bullish") {
      quantity =
        side === "bid"
          ? 18_000 - index * 900 + (index === 1 ? 22_000 : 0)
          : 6_500 - index * 350 + (index === 4 ? 9_000 : 0);
    } else if (pattern === "bearish") {
      quantity =
        side === "bid"
          ? 4_500 - index * 200
          : 20_000 - index * 700 + (index === 0 ? 35_000 : 0);
    } else {
      quantity = side === "bid" ? 10_000 - index * 500 : 9_500 - index * 450;
    }

    levels.push({ price, quantity: Math.max(quantity, 500) });
  }

  // 상방 호가 공백 (bullish): 6~7호가 구간 얇게
  if (pattern === "bullish" && side === "ask" && levels[5]) {
    levels[5] = { ...levels[5], quantity: 800 };
    if (levels[6]) {
      levels[6] = { ...levels[6], price: levels[5].price + tick * 3, quantity: 900 };
    }
  }

  // 하방 공백 과다 (bearish): 매수 4~5호가 sparse
  if (pattern === "bearish" && side === "bid" && levels[3]) {
    levels[3] = { ...levels[3], price: levels[2].price - tick * 4, quantity: 600 };
    levels[4] = { ...levels[4], price: levels[3].price - tick * 5, quantity: 700 };
  }

  return levels;
}

/** worker 미연결 시 UI·점수 검증용 호가 샘플 (실제 매매 판단에 사용하지 않음). */
export function generateSampleOrderbook(stockCode: string, currentPrice?: number | null): IntradayOrderbook {
  const pattern = patternForCode(stockCode);
  const basePrice = currentPrice && currentPrice > 0 ? currentPrice : defaultPrice(stockCode);
  const bidLevels = buildLevels(basePrice, "bid", pattern);
  const askLevels = buildLevels(basePrice, "ask", pattern);

  const spreadRate =
    pattern === "bullish" ? 0.14 : pattern === "bearish" ? 0.72 : 0.38;
  const tradeStrength =
    pattern === "bullish" ? 128 : pattern === "bearish" ? 84 : 102;

  return {
    stockCode,
    bidLevels,
    askLevels,
    spreadRate,
    tradeStrength,
    capturedAt: new Date().toISOString(),
  };
}
