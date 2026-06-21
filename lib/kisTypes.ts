export type KisTokenResult =
  | { ok: true; accessToken: string; expiresAt: string }
  | { ok: false; message: string };

export type KisRequestError = {
  ok: false;
  message: string;
  code?: string;
};

export type KisCurrentPrice = {
  stockCode: string;
  currentPrice: number;
  change: number;
  changeRate: number;
  tradingVolume: number;
  tradingValue: number;
  previousClose: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  updatedAt: string;
  source: "KIS";
};

export type KisOhlcvBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradingValue: number;
};

export type KisOrderbookQuote = {
  stockCode: string;
  asks: Array<{ price: number; volume: number }>;
  bids: Array<{ price: number; volume: number }>;
  totalAskVolume: number;
  totalBidVolume: number;
  spread: number | null;
  orderbookAvailable: boolean;
  source: "KIS";
  updatedAt: string;
};

export type KisMarketIndex = {
  indexCode: string;
  currentValue: number;
  change: number;
  changeRate: number;
  direction: "up" | "down" | "flat";
  source: "KIS";
  updatedAt: string;
};

export type KisHealthStatus = {
  kisConfigured: boolean;
  tokenAvailable: boolean;
  readOnlyMode: boolean;
  orderEnabled: boolean;
  orderApisImplemented: boolean;
  kisMode: string;
  message: string;
};

export type KisPeriod = "daily" | "weekly" | "monthly" | "yearly";
