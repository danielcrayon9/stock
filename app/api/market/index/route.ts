import { NextRequest, NextResponse } from "next/server";
import { getWorkerMarketIndex } from "@/lib/realtimeClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const indexCode = request.nextUrl.searchParams.get("indexCode") || "KOSPI";
  const data = await getWorkerMarketIndex(indexCode).catch(() => null);
  return NextResponse.json({
    ok: true,
    data,
    message: data
      ? "realtime-worker 기준 시장 지수입니다."
      : "시장 지수 worker가 연결되지 않았습니다. 조회 전용 준비 상태입니다.",
  });
}
