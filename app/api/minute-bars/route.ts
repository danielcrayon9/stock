import { NextRequest, NextResponse } from "next/server";
import { getWorkerMinuteBars } from "@/lib/realtimeClient";
import { getMinuteBarsForAnalysis } from "@/lib/minuteBarService";
import type { MinuteInterval } from "@/lib/intradayTypes";

export const dynamic = "force-dynamic";

const INTERVALS: MinuteInterval[] = ["1m", "3m", "5m", "15m"];

export async function GET(request: NextRequest) {
  const stockCode = request.nextUrl.searchParams.get("stockCode")?.trim() ?? "";
  const interval = (request.nextUrl.searchParams.get("interval") || "5m") as MinuteInterval;

  if (!/^\d{6}$/.test(stockCode)) {
    return NextResponse.json({ ok: false, error: "6자리 종목코드가 필요합니다." }, { status: 400 });
  }
  if (!INTERVALS.includes(interval)) {
    return NextResponse.json({ ok: false, error: "interval은 1m, 3m, 5m, 15m 중 하나여야 합니다." }, { status: 400 });
  }

  const workerOnly = request.nextUrl.searchParams.get("workerOnly") === "true";
  if (workerOnly) {
    const data = await getWorkerMinuteBars(stockCode, interval).catch(() => null);
    return NextResponse.json({
      ok: true,
      data: data ?? [],
      message: data ? "realtime-worker 기준 분봉 데이터입니다." : "분봉 worker가 연결되지 않았습니다.",
    });
  }

  const result = await getMinuteBarsForAnalysis(stockCode, interval);
  return NextResponse.json({
    ok: true,
    data: result.bars,
    source: result.source,
    message: result.message,
  });
}
