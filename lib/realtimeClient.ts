import type {
  IntradayOrderbook,
  IntradayScanSnapshot,
  MarketIndexSnapshot,
  MinuteBar,
  MinuteInterval,
} from "@/lib/intradayTypes";
import type { MarketIndexContext } from "@/lib/sampleMarketIndexes";
import type { VolumePersistenceContext } from "@/lib/volumePersistenceContext";

function workerBaseUrl() {
  return process.env.REALTIME_WORKER_URL?.trim().replace(/\/$/, "") || "";
}

function workerHeaders(): Record<string, string> {
  const secret = process.env.WORKER_API_SECRET?.trim();
  return secret ? { Authorization: `Bearer ${secret}` } : {};
}

async function workerGet<T>(path: string): Promise<T | null> {
  const base = workerBaseUrl();
  if (!base) return null;

  const response = await fetch(`${base}${path}`, {
    headers: workerHeaders(),
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as T;
}

export async function getWorkerIntradaySnapshot(): Promise<IntradayScanSnapshot | null> {
  return workerGet<IntradayScanSnapshot>("/intraday/snapshot");
}

export async function getWorkerMinuteBars(stockCode: string, interval: MinuteInterval): Promise<MinuteBar[] | null> {
  return workerGet<MinuteBar[]>(`/minute-bars?stockCode=${encodeURIComponent(stockCode)}&interval=${encodeURIComponent(interval)}`);
}

export async function getWorkerOrderbook(stockCode: string): Promise<IntradayOrderbook | null> {
  return workerGet<IntradayOrderbook>(`/orderbook?stockCode=${encodeURIComponent(stockCode)}`);
}

export async function getWorkerMarketIndex(indexCode: string): Promise<MarketIndexSnapshot | null> {
  return workerGet<MarketIndexSnapshot>(`/market/index?indexCode=${encodeURIComponent(indexCode)}`);
}

export async function getWorkerVolumeContext(stockCode: string): Promise<VolumePersistenceContext | null> {
  return workerGet<VolumePersistenceContext>(`/volume-context?stockCode=${encodeURIComponent(stockCode)}`);
}

export async function getWorkerMarketContext(): Promise<MarketIndexContext | null> {
  return workerGet<MarketIndexContext>("/market/context");
}
