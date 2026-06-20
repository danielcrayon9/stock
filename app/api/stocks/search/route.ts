import { NextRequest, NextResponse } from "next/server";
import { searchStocks } from "@/lib/stockData";
import { parseSearchQuery } from "@/lib/validators";

export async function GET(request: NextRequest) {
  const parsed = parseSearchQuery(request.nextUrl.searchParams.get("query"));
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const market = request.nextUrl.searchParams.get("market");
  const allowedMarkets = ["KOSPI", "KOSDAQ", "KONEX"] as const;
  const normalizedMarket = allowedMarkets.find((value) => value === market);

  const data = await searchStocks(parsed.data, normalizedMarket);
  return NextResponse.json({
    ok: true,
    data,
    message:
      data.length > 0
        ? "로컬 종목 목록에서 검색했습니다."
        : "검색 결과가 없습니다. 종목코드 6자리 또는 등록된 종목명을 입력해 주세요.",
  });
}
