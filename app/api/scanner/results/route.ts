import { NextRequest, NextResponse } from "next/server";
import { getRecommendations, getScanResults } from "@/lib/scanStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const scanRunId = request.nextUrl.searchParams.get("scanRunId")?.trim();
    if (!scanRunId) {
      return NextResponse.json({ ok: false, error: "scanRunId가 필요합니다." }, { status: 400 });
    }

    const [results, recommendations] = await Promise.all([
      getScanResults(scanRunId),
      getRecommendations(scanRunId),
    ]);

    return NextResponse.json({ ok: true, data: { scanRunId, results, recommendations } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "스캔 결과 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
