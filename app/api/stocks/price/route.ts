import { NextRequest, NextResponse } from "next/server";
import { getStockPrice } from "@/lib/stockData";
import { parseStockCode } from "@/lib/validators";
import type { Market } from "@/lib/types";

export async function GET(request: NextRequest) {
  const parsed = parseStockCode(request.nextUrl.searchParams.get("stockCode"));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const market = request.nextUrl.searchParams.get("market");
  const allowedMarkets: Market[] = ["KOSPI", "KOSDAQ", "KONEX", "UNKNOWN"];
  const normalizedMarket = allowedMarkets.find((value) => value === market);

  const data = await getStockPrice(parsed.data, normalizedMarket);
  if (!data) {
    return NextResponse.json({ ok: false, error: "종목을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, data });
}
