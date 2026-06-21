import { NextRequest, NextResponse } from "next/server";
import { getIntradaySnapshot } from "@/lib/intradayScanner";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const target = (request.nextUrl.searchParams.get("target") || "KOSPI200_KOSDAQ100") as Parameters<
    typeof getIntradaySnapshot
  >[0];

  const snapshot = await getIntradaySnapshot(target);

  return NextResponse.json({
    ok: true,
    data: {
      generatedAt: snapshot.generatedAt,
      excludedCount: snapshot.excludedCount,
      topCandidates: snapshot.topCandidates,
      aiCandidatePool: snapshot.aiCandidatePool,
      candidates: snapshot.candidates,
    },
    message: snapshot.message,
  });
}
