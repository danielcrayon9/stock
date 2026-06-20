import { NextRequest, NextResponse } from "next/server";
import { getIntradaySnapshot } from "@/lib/intradayScanner";
import type { ScanTarget } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { target?: ScanTarget };
  const snapshot = await getIntradaySnapshot(body.target ?? "KOSPI200_KOSDAQ100");
  return NextResponse.json({
    ok: true,
    data: snapshot,
    message: "장중 스캔 1단계는 조회 전용 스냅샷을 반환합니다. 실제 주문은 실행되지 않습니다.",
  });
}
