import { NextResponse } from "next/server";
import { getEnvStatus } from "@/lib/googleSheets";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "korea-stock-ai",
    phase: 8,
    env: getEnvStatus(),
  });
}
