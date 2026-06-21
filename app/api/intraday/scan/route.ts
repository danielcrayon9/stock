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
    message: "7단계: 종합 점수·강제 제외·Top 후보 추출을 완료했습니다. 실제 주문은 실행되지 않습니다.",
  });
}
