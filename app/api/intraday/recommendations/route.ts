import { NextResponse } from "next/server";
import { getIntradaySnapshot } from "@/lib/intradayScanner";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getIntradaySnapshot();
  return NextResponse.json({
    ok: true,
    data: {
      generatedAt: snapshot.generatedAt,
      status: snapshot.status,
      recommendations: snapshot.candidates,
      safetyMessage: snapshot.safetyMessage,
    },
  });
}
