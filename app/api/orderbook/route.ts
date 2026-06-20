import { NextRequest, NextResponse } from "next/server";
import { getWorkerOrderbook } from "@/lib/realtimeClient";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";
  if (!/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ ok: false, error: "6자리 종목코드가 필요합니다." }, { status: 400 });
  }

  const data = await getWorkerOrderbook(stockCode).catch(() => null);
  return NextResponse.json({
    ok: true,
    data,
    message: data
      ? "realtime-worker 기준 호가 요약입니다."
      : "호가 worker가 연결되지 않았습니다. 조회 전용 준비 상태입니다.",
  });
}
