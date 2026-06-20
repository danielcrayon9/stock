import { NextRequest, NextResponse } from "next/server";
import { getOhlcv } from "@/lib/ohlcv";
import { parseOhlcvPeriod, parseStockCode } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const stockCodeResult = parseStockCode(request.nextUrl.searchParams.get("stockCode"));
  if (!stockCodeResult.ok) {
    return NextResponse.json({ ok: false, error: stockCodeResult.error }, { status: 400 });
  }

  const periodResult = parseOhlcvPeriod(request.nextUrl.searchParams.get("period"));
  if (!periodResult.ok) {
    return NextResponse.json({ ok: false, error: periodResult.error }, { status: 400 });
  }

  const market = request.nextUrl.searchParams.get("market") ?? undefined;
  const data = await getOhlcv(stockCodeResult.data, periodResult.data, market);

  return NextResponse.json({ ok: true, data });
}
