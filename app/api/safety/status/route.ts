import { NextResponse } from "next/server";
import { getSafetyStatus } from "@/lib/safetyGuard";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = getSafetyStatus();
  return NextResponse.json({ ok: status.ok, data: status }, { status: status.ok ? 200 : 500 });
}
