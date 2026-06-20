import { NextRequest, NextResponse } from "next/server";
import { getNews } from "@/lib/newsService";
import { parseSearchQuery, parseStockCode } from "@/lib/validators";

function parseDays(value: string | null) {
  const days = Number(value ?? 7);
  if (![1, 7, 30].includes(days)) return 7;
  return days;
}

export async function GET(request: NextRequest) {
  const stockName = parseSearchQuery(request.nextUrl.searchParams.get("stockName"));
  if (!stockName.ok) {
    return NextResponse.json({ ok: false, error: stockName.error }, { status: 400 });
  }

  const stockCode = parseStockCode(request.nextUrl.searchParams.get("stockCode"));
  if (!stockCode.ok) {
    return NextResponse.json({ ok: false, error: stockCode.error }, { status: 400 });
  }

  const data = await getNews(stockName.data, stockCode.data, parseDays(request.nextUrl.searchParams.get("days")));
  return NextResponse.json({ ok: true, data });
}
