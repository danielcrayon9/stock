import { NextRequest, NextResponse } from "next/server";
import { runMarketScan } from "@/lib/marketScanner";
import { findCachedRunToday, getRecommendations, getScanResults } from "@/lib/scanStore";
import { parseScanFilters } from "@/lib/validators";
import type { ScanRunResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const filters = parseScanFilters(body);

    if (!filters.forceRescan) {
      const cached = await findCachedRunToday(filters);
      if (cached) {
        const [results, recommendations] = await Promise.all([
          getScanResults(cached.id),
          getRecommendations(cached.id),
        ]);
        const response: ScanRunResponse = {
          run: cached,
          results,
          recommendations,
          cached: true,
          message: "같은 날 같은 조건의 스캔 결과를 캐시에서 불러왔습니다. 강제 재스캔하려면 forceRescan을 사용하세요.",
        };
        return NextResponse.json({ ok: true, data: response });
      }
    }

    const data = await runMarketScan(filters);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "시장 스캔 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
