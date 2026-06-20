import { NextRequest, NextResponse } from "next/server";
import { getDisclosures } from "@/lib/dartService";
import { parseStockCode } from "@/lib/validators";

function parseDays(value: string | null) {
  const days = Number(value ?? 90);
  if (![30, 90, 365].includes(days)) return 90;
  return days;
}

export async function GET(request: NextRequest) {
  const stockCode = parseStockCode(request.nextUrl.searchParams.get("stockCode"));
  if (!stockCode.ok) {
    return NextResponse.json({ ok: false, error: stockCode.error }, { status: 400 });
  }

  const data = await getDisclosures(stockCode.data, parseDays(request.nextUrl.searchParams.get("days")));
  return NextResponse.json({ ok: true, data });
}
