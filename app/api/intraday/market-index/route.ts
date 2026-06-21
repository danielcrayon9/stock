import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketIndexForCandidate } from "@/lib/marketIndexAnalysis";
import { getMarketIndexContext } from "@/lib/marketIndexService";
import type { Market } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";
  const market = (request.nextUrl.searchParams.get("market") || "KOSPI") as Market;
  const changeRateParam = request.nextUrl.searchParams.get("changeRate");
  const changeRate = changeRateParam != null ? Number(changeRateParam) : null;

  const context = await getMarketIndexContext();
  const analysis = analyzeMarketIndexForCandidate(context, {
    stockCode: /^\d{6}$/.test(stockCode) ? stockCode : "005930",
    market: market === "KOSDAQ" ? "KOSDAQ" : "KOSPI",
    changeRate: Number.isFinite(changeRate) ? changeRate : null,
    tradingValue: null,
  });

  return NextResponse.json({
    ok: true,
    data: {
      context,
      ...analysis,
    },
    message: context.message,
  });
}
