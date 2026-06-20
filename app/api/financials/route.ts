import { NextRequest, NextResponse } from "next/server";
import { getFinancialAnalysis } from "@/lib/financialAnalysis";
import { parseStockCode } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const stockCode = parseStockCode(request.nextUrl.searchParams.get("stockCode"));
  if (!stockCode.ok) {
    return NextResponse.json({ ok: false, error: stockCode.error }, { status: 400 });
  }

  const data = await getFinancialAnalysis(stockCode.data);
  return NextResponse.json({ ok: true, data });
}
