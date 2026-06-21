import { NextRequest, NextResponse } from "next/server";
import { getMinuteBarsForAnalysis } from "@/lib/minuteBarService";
import { analyzeMinuteFlow } from "@/lib/minuteFlowAnalysis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";

  if (!/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ ok: false, error: "6자리 종목코드가 필요합니다." }, { status: 400 });
  }

  const fetchResult = await getMinuteBarsForAnalysis(stockCode, "5m");
  const analysis = analyzeMinuteFlow(fetchResult.bars);

  return NextResponse.json({
    ok: true,
    data: {
      stockCode,
      ...analysis,
      bars: fetchResult.bars.slice(-30),
      source: fetchResult.source,
    },
    message: fetchResult.message,
  });
}
