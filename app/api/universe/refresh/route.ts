import { NextResponse } from "next/server";
import { refreshUniverse } from "@/lib/universeService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  try {
    const result = await refreshUniverse();
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "유니버스 갱신 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
