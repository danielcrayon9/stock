import type { IntradayOrderbook, OrderbookCheck, OrderbookLevel } from "@/lib/intradayTypes";

export type OrderbookGapMetrics = {
  ask5Qty: number;
  bid5Qty: number;
  ask10Qty: number;
  bid10Qty: number;
  spreadRate: number | null;
  tradeStrength: number | null;
  upperGapDetected: boolean;
  lowerGapExcessive: boolean;
  sellWallPrice: number | null;
  sellWallQty: number | null;
  buyWallPrice: number | null;
  buyWallQty: number | null;
};

export type OrderbookAnalysisContext = {
  recent5MinTradingValue?: number | null;
};

export type OrderbookGapResult = {
  score: number | null;
  summary: string;
  signals: string[];
  checks: OrderbookCheck[];
  metrics: OrderbookGapMetrics | null;
};

function sumQuantity(levels: OrderbookLevel[], count: number): number {
  return levels.slice(0, count).reduce((sum, level) => sum + level.quantity, 0);
}

function maxLevel(levels: OrderbookLevel[]): OrderbookLevel | null {
  if (levels.length === 0) return null;
  return levels.reduce((max, level) => (level.quantity > max.quantity ? level : max), levels[0]);
}

function buildCheck(
  id: string,
  label: string,
  passed: boolean | null,
  scoreDelta: number,
  detail: string,
): OrderbookCheck {
  return { id, label, passed, scoreDelta, detail };
}

function detectUpperGap(askLevels: OrderbookLevel[]): boolean {
  for (let index = 0; index < Math.min(askLevels.length - 1, 9); index += 1) {
    const current = askLevels[index];
    const next = askLevels[index + 1];
    if (current.price <= 0) continue;
    const gapRate = (next.price - current.price) / current.price;
    if (gapRate > 0.0025 && next.quantity < current.quantity * 0.55) {
      return true;
    }
  }
  return false;
}

function detectLowerGapExcessive(bidLevels: OrderbookLevel[]): boolean {
  if (bidLevels.length < 5) return false;

  const bid5Qty = sumQuantity(bidLevels, 5);
  const bid1Qty = bidLevels[0]?.quantity ?? 0;
  const priceGap =
    bidLevels[0].price > 0
      ? (bidLevels[0].price - bidLevels[4].price) / bidLevels[0].price
      : 0;

  const sparseQty = bid5Qty < 8_000;
  const wideGap = priceGap > 0.012;
  const topHeavy = bid1Qty > 0 && bid5Qty / bid1Qty < 1.8 && priceGap > 0.01;

  return (sparseQty && wideGap) || topHeavy;
}

function computeMetrics(book: IntradayOrderbook): OrderbookGapMetrics {
  const sellWall = maxLevel(book.askLevels);
  const buyWall = maxLevel(book.bidLevels);

  return {
    ask5Qty: sumQuantity(book.askLevels, 5),
    bid5Qty: sumQuantity(book.bidLevels, 5),
    ask10Qty: sumQuantity(book.askLevels, 10),
    bid10Qty: sumQuantity(book.bidLevels, 10),
    spreadRate: book.spreadRate,
    tradeStrength: book.tradeStrength,
    upperGapDetected: detectUpperGap(book.askLevels),
    lowerGapExcessive: detectLowerGapExcessive(book.bidLevels),
    sellWallPrice: sellWall?.price ?? null,
    sellWallQty: sellWall?.quantity ?? null,
    buyWallPrice: buyWall?.price ?? null,
    buyWallQty: buyWall?.quantity ?? null,
  };
}

export function analyzeOrderbookGap(
  book: IntradayOrderbook | null,
  context: OrderbookAnalysisContext = {},
): OrderbookGapResult {
  if (!book || book.bidLevels.length === 0 || book.askLevels.length === 0) {
    return {
      score: null,
      summary: "호가 데이터 부족",
      signals: ["호가 worker 연결 필요"],
      checks: [],
      metrics: null,
    };
  }

  const metrics = computeMetrics(book);
  const { ask5Qty, bid5Qty, ask10Qty } = metrics;

  const thinAsk5 = bid5Qty > 0 && ask5Qty < bid5Qty * 0.75;
  const thickBid5 = ask5Qty > 0 && bid5Qty > ask5Qty * 1.25;

  const sellWall = maxLevel(book.askLevels);
  const sellWallNotional =
    sellWall != null ? sellWall.price * sellWall.quantity : 0;
  const recentTv = context.recent5MinTradingValue ?? 0;
  const sellWallAbsorption =
    sellWallNotional > 0 &&
    recentTv > 0 &&
    recentTv >= sellWallNotional * 0.35;

  const upperGap = metrics.upperGapDetected;
  const lowerGapExcessive = metrics.lowerGapExcessive;

  const spreadExcessive = book.spreadRate != null && book.spreadRate > 0.5;
  const tradeStrengthWeak = book.tradeStrength != null && book.tradeStrength < 95;

  const sellWallExcess =
    ask10Qty > 0 &&
    sellWall != null &&
    sellWall.quantity / ask10Qty >= 0.35 &&
    ask5Qty > bid5Qty * 1.4;

  const checks: OrderbookCheck[] = [
    buildCheck(
      "thin-ask5",
      "상방 5호가 매도잔량 얇음",
      ask5Qty > 0 && bid5Qty > 0 ? thinAsk5 : null,
      thinAsk5 ? 10 : 0,
      thinAsk5
        ? `매도 ${ask5Qty.toLocaleString()} < 매수 ${bid5Qty.toLocaleString()}`
        : "매도잔량 얇음 미확인",
    ),
    buildCheck(
      "thick-bid5",
      "하방 5호가 매수잔량 두꺼움",
      ask5Qty > 0 && bid5Qty > 0 ? thickBid5 : null,
      thickBid5 ? 10 : 0,
      thickBid5
        ? `매수 ${bid5Qty.toLocaleString()} > 매도 ${ask5Qty.toLocaleString()}`
        : "매수잔량 두꺼움 미확인",
    ),
    buildCheck(
      "sell-wall-absorb",
      "매도벽 거래대금 소화 중",
      sellWallNotional > 0 ? sellWallAbsorption : null,
      sellWallAbsorption ? 15 : 0,
      sellWallAbsorption
        ? `최근 5분 거래대금이 매도벽 규모의 35% 이상`
        : "매도벽 소화 미확인",
    ),
    buildCheck(
      "upper-gap",
      "상방 호가 공백",
      upperGap,
      upperGap ? 5 : 0,
      upperGap ? "상단 호가 간 공백 존재" : "상방 공백 없음",
    ),
    buildCheck(
      "lower-gap",
      "하방 호가 공백 과다",
      lowerGapExcessive,
      lowerGapExcessive ? -20 : 0,
      lowerGapExcessive ? "하단 매수 호가 sparse" : "하방 공백 과다 없음",
    ),
    buildCheck(
      "spread",
      "스프레드 과다",
      book.spreadRate == null ? null : spreadExcessive,
      spreadExcessive ? -15 : 0,
      book.spreadRate == null
        ? "스프레드 데이터 없음"
        : spreadExcessive
          ? `스프레드 ${book.spreadRate.toFixed(2)}%`
          : `스프레드 ${book.spreadRate.toFixed(2)}% 양호`,
    ),
    buildCheck(
      "trade-strength",
      "체결강도 약화",
      book.tradeStrength == null ? null : tradeStrengthWeak,
      tradeStrengthWeak ? -10 : 0,
      book.tradeStrength == null
        ? "체결강도 데이터 없음"
        : tradeStrengthWeak
          ? `체결강도 ${book.tradeStrength.toFixed(0)}`
          : `체결강도 ${book.tradeStrength.toFixed(0)}`,
    ),
    buildCheck(
      "sell-wall-excess",
      "매도벽 과다",
      ask10Qty > 0 ? sellWallExcess : null,
      sellWallExcess ? -15 : 0,
      sellWallExcess
        ? `매도벽 ${sellWall?.quantity.toLocaleString() ?? "-"}주 (${((sellWall!.quantity / ask10Qty) * 100).toFixed(0)}%)`
        : "매도벽 과다 없음",
    ),
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.scoreDelta : 0), 0);
  const positives = checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label);
  const negatives = checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label);

  const signals = [
    ...positives.map((label) => `${label} ✓`),
    ...negatives.map((label) => `${label} ⚠`),
  ];
  if (signals.length === 0) signals.push("호가 공백 중립");

  return {
    score,
    summary: `호가 공백 ${score}점 · ${positives.length}개 긍정 · ${negatives.length}개 경고`,
    signals,
    checks,
    metrics,
  };
}
