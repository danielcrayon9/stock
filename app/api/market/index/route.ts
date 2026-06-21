import { NextRequest, NextResponse } from "next/server";
import { analyzeMarketIndexes } from "@/lib/marketIndexAnalysis";
import { getMarketIndexContext } from "@/lib/marketIndexService";
import { getWorkerMarketIndex } from "@/lib/realtimeClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const indexCode = request.nextUrl.searchParams.get("indexCode") || "KOSPI";
  const fullContext = request.nextUrl.searchParams.get("full") === "true";

  if (fullContext) {
    const context = await getMarketIndexContext();
    const analysis = analyzeMarketIndexes(context);
    return NextResponse.json({
      ok: true,
      data: { context, analysis },
      message: context.message,
    });
  }

  const workerOnly = request.nextUrl.searchParams.get("workerOnly") === "true";
  if (workerOnly) {
    const data = await getWorkerMarketIndex(indexCode).catch(() => null);
    return NextResponse.json({
      ok: true,
      data,
      message: data ? "realtime-worker 기준 시장 지수입니다." : "시장 지수 worker가 연결되지 않았습니다.",
    });
  }

  const context = await getMarketIndexContext();
  const index = context.indexes.find((item) => item.indexCode === indexCode) ?? null;

  return NextResponse.json({
    ok: true,
    data: index,
    context: context.indexes,
    source: context.source,
    message: context.message,
  });
}
