import { NextResponse } from "next/server";
import { getLatestScanRun, getRecommendations } from "@/lib/scanStore";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const run = await getLatestScanRun();
    if (!run) {
      return NextResponse.json({ ok: true, data: { run: null, recommendations: [] }, message: "추천 결과가 없습니다." });
    }

    const recommendations = await getRecommendations(run.id);
    return NextResponse.json({ ok: true, data: { run, recommendations } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "추천 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
