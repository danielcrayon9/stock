import { NextRequest, NextResponse } from "next/server";
import { getIntradaySnapshot } from "@/lib/intradayScanner";
import type { ScanTarget } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const target = (request.nextUrl.searchParams.get("target") || "KOSPI200_KOSDAQ100") as ScanTarget;
  const snapshot = await getIntradaySnapshot(target);
  return NextResponse.json({ ok: true, data: snapshot });
}
