import { NextResponse } from "next/server";
import { checkKisConnection } from "@/lib/kisClient";
import { assertReadOnlySafety } from "@/lib/safetyGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    assertReadOnlySafety();
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "안전 설정 오류",
      },
      { status: 500 },
    );
  }

  const status = await checkKisConnection();
  return NextResponse.json({
    ok: status.kisConfigured && status.tokenAvailable && status.readOnlyMode && !status.orderEnabled,
    data: status,
  });
}
