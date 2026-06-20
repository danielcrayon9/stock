import { NextRequest, NextResponse } from "next/server";
import { getUniverse } from "@/lib/universeService";
import { UNIVERSE_TYPES } from "@/lib/constants";
import type { UniverseType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const typeParam = request.nextUrl.searchParams.get("type") ?? "KOSPI200";
    if (!UNIVERSE_TYPES.includes(typeParam as UniverseType)) {
      return NextResponse.json(
        { ok: false, error: `type은 ${UNIVERSE_TYPES.join(", ")} 중 하나여야 합니다.` },
        { status: 400 },
      );
    }

    const universe = await getUniverse(typeParam as UniverseType);
    return NextResponse.json({
      ok: true,
      data: {
        type: universe.type,
        source: universe.source,
        message: universe.message,
        count: universe.stocks.length,
        stocks: universe.stocks,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "유니버스 조회 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
