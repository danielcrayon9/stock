import { NextRequest, NextResponse } from "next/server";
import { analyzeTodayNews } from "@/lib/todayNewsAnalysis";
import { getTodayNewsForAnalysis } from "@/lib/todayNewsService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";
  const stockName = request.nextUrl.searchParams.get("stockName")?.trim() ?? "종목";

  if (!/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ ok: false, error: "6자리 종목코드가 필요합니다." }, { status: 400 });
  }

  const fetchResult = await getTodayNewsForAnalysis(stockCode, stockName);
  const analysis = analyzeTodayNews(fetchResult.items, fetchResult.disclosuresToday);

  return NextResponse.json({
    ok: true,
    data: {
      stockCode,
      stockName,
      items: fetchResult.items.slice(0, 10),
      disclosuresToday: fetchResult.disclosuresToday,
      ...analysis,
      source: fetchResult.source,
    },
    message: fetchResult.message,
  });
}
