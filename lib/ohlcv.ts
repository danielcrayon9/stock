import { getDailyOhlcv, getIntradayOhlcv, getPeriodOhlcv } from "@/lib/stockData";
import type { OhlcvPeriod, OhlcvPoint, OhlcvResult } from "@/lib/types";

function getPeriodKey(date: string, period: Exclude<OhlcvPeriod, "daily">) {
  const [year, month] = date.split("-");
  if (period === "yearly") return year;
  if (period === "monthly") return `${year}-${month}`;

  const parsed = new Date(`${date}T00:00:00`);
  const day = parsed.getUTCDay() || 7;
  const thursday = new Date(parsed);
  thursday.setUTCDate(parsed.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function aggregateOhlcv(points: OhlcvPoint[], period: OhlcvPeriod): OhlcvPoint[] {
  if (period === "daily") return points;
  if (points.length === 0) return [];

  const grouped = new Map<string, OhlcvPoint[]>();

  points.forEach((point) => {
    const key = getPeriodKey(point.date, period);
    const bucket = grouped.get(key) ?? [];
    bucket.push(point);
    grouped.set(key, bucket);
  });

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, bucket]) => {
      const first = bucket[0];
      const last = bucket.at(-1)!;

      return {
        date: last.date,
        open: first.open,
        high: Math.max(...bucket.map((point) => point.high)),
        low: Math.min(...bucket.map((point) => point.low)),
        close: last.close,
        volume: bucket.reduce((sum, point) => sum + point.volume, 0),
        tradingValue: bucket.reduce((sum, point) => sum + point.tradingValue, 0),
      };
    });
}

export async function getOhlcv(stockCode: string, period: OhlcvPeriod, market?: string): Promise<OhlcvResult> {
  if (period === "intraday") {
    return getIntradayOhlcv(stockCode);
  }

  if (period === "daily") {
    const daily = await getDailyOhlcv(
      stockCode,
      market as "KOSPI" | "KOSDAQ" | "KONEX" | "UNKNOWN" | undefined,
    );
    return {
      stockCode,
      period,
      points: daily.points,
      status: daily.status,
      source: daily.source,
      partial: daily.partial,
      message: daily.message,
    };
  }

  const direct = await getPeriodOhlcv(stockCode, period);
  if (direct.source === "KIS" && direct.points.length > 0) {
    return {
      stockCode,
      period,
      points: direct.points,
      status: direct.status,
      source: direct.source,
      partial: direct.partial,
      message: direct.message,
    };
  }

  const daily = await getDailyOhlcv(
    stockCode,
    market as "KOSPI" | "KOSDAQ" | "KONEX" | "UNKNOWN" | undefined,
  );

  if (daily.points.length === 0) {
    return {
      stockCode,
      period,
      points: [],
      status: daily.status,
      source: daily.source,
      message: daily.message,
    };
  }

  const points = aggregateOhlcv(daily.points, period);

  return {
    stockCode,
    period,
    points,
    status: daily.status,
    source: daily.source,
    message: `${daily.message} ${period} 봉은 일봉 데이터를 집계해 생성했습니다.`,
  };
}

export type { OhlcvPoint };
