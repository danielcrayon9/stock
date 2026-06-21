import { NextRequest, NextResponse } from "next/server";
import { getOhlcv } from "@/lib/ohlcv";
import { parseIntradayInterval, parseOhlcvPeriod, parseStockCode } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const stockCodeResult = parseStockCode(request.nextUrl.searchParams.get("stockCode"));
  if (!stockCodeResult.ok) {
    return NextResponse.json({ ok: false, error: stockCodeResult.error }, { status: 400 });
  }

  const intervalResult = parseIntradayInterval(request.nextUrl.searchParams.get("interval"));
  if (!intervalResult.ok) {
    return NextResponse.json({ ok: false, error: intervalResult.error }, { status: 400 });
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const effectivePeriod =
    periodParam?.trim() || (intervalResult.data ? "intraday" : "daily");
  const periodResult = parseOhlcvPeriod(effectivePeriod);
  if (!periodResult.ok) {
    return NextResponse.json({ ok: false, error: periodResult.error }, { status: 400 });
  }

  const market = request.nextUrl.searchParams.get("market") ?? undefined;
  const data = await getOhlcv(stockCodeResult.data, periodResult.data, market);

  return NextResponse.json({
    ok: true,
    data: {
      ...data,
      interval: intervalResult.data,
    },
  });
}
