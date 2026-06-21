import { NextRequest, NextResponse } from "next/server";
import { getMarketIndex as getKisMarketIndex } from "@/lib/kisClient";
import { isKisConfigured } from "@/lib/kisToken";
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

  if (!index && isKisConfigured()) {
    try {
      const kis = await getKisMarketIndex(indexCode);
      if (kis) {
        return NextResponse.json({
          ok: true,
          data: {
            indexCode: kis.indexCode,
            currentValue: kis.currentValue,
            change: kis.change,
            changeRate: kis.changeRate,
            direction: kis.direction,
            source: "KIS",
            updatedAt: kis.updatedAt,
          },
          source: "KIS",
          message: "KIS API 기준 시장 지수입니다.",
        });
      }
    } catch {
      // context fallback
    }
  }

  return NextResponse.json({
    ok: true,
    data: index
      ? {
          indexCode: index.indexCode,
          currentValue: index.currentValue,
          change: null,
          changeRate: index.changeRate,
          direction:
            index.direction === "상승" ? "up" : index.direction === "하락" ? "down" : "flat",
          source: context.source,
          updatedAt: index.capturedAt,
        }
      : null,
    context: context.indexes,
    source: context.source,
    message: context.message,
  });
}
