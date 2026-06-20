import { NextResponse } from "next/server";
import { getLatestScanRun, getRecommendations, getScanResults } from "@/lib/scanStore";
import type { ScanRunResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const run = await getLatestScanRun();
    if (!run) {
      return NextResponse.json({ ok: true, data: null, message: "저장된 스캔 결과가 없습니다." });
    }

    const [results, recommendations] = await Promise.all([
      getScanResults(run.id),
      getRecommendations(run.id),
    ]);

    const data: ScanRunResponse = {
      run,
      results,
      recommendations,
      cached: true,
      message: "가장 최근 스캔 결과입니다.",
    };
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "최근 스캔 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
