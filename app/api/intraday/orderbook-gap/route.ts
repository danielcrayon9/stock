import { NextRequest, NextResponse } from "next/server";
import { getMinuteBarsForAnalysis } from "@/lib/minuteBarService";
import { analyzeOrderbookGap } from "@/lib/orderbookAnalysis";
import { getOrderbookForAnalysis } from "@/lib/orderbookService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";

  if (!/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ ok: false, error: "6자리 종목코드가 필요합니다." }, { status: 400 });
  }

  const barsResult = await getMinuteBarsForAnalysis(stockCode, "5m");
  const latestBar = barsResult.bars.at(-1);
  const fetchResult = await getOrderbookForAnalysis(stockCode, latestBar?.close ?? null);
  const analysis = analyzeOrderbookGap(fetchResult.book, {
    recent5MinTradingValue: latestBar?.tradingValue ?? null,
  });

  return NextResponse.json({
    ok: true,
    data: {
      stockCode,
      orderbook: fetchResult.book,
      ...analysis,
      source: fetchResult.source,
    },
    message: fetchResult.message,
  });
}
