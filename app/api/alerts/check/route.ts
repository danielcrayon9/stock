import { NextRequest, NextResponse } from "next/server";
import { runAlertCheck } from "@/lib/alertService";

export async function GET(request: NextRequest) {
  const includeMarketClosed = request.nextUrl.searchParams.get("force") === "true";
  const data = await runAlertCheck({ includeMarketClosed });
  return NextResponse.json({ ok: true, data });
}
