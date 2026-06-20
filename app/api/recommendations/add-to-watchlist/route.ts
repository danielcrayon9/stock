import { NextRequest, NextResponse } from "next/server";
import { appendRow, GoogleSheetsConfigError } from "@/lib/googleSheets";
import { DEFAULT_TARGET_PROFIT_RATE } from "@/lib/constants";
import { nowIso } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const stockCode = String(body.stockCode ?? "").trim();
    const stockName = String(body.stockName ?? "").trim();

    if (!stockCode || !stockName) {
      return NextResponse.json({ ok: false, error: "종목코드와 종목명이 필요합니다." }, { status: 400 });
    }

    const now = nowIso();
    const row = {
      id: crypto.randomUUID(),
      stockCode,
      stockName,
      market: String(body.market ?? "UNKNOWN").trim(),
      targetProfitRate: Number(body.targetProfitRate) || DEFAULT_TARGET_PROFIT_RATE,
      memo: "시장 스캐너 추천",
      lastAnalyzedAt: "",
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    await appendRow("watchlist", row);
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (error) {
    const status = error instanceof GoogleSheetsConfigError ? 503 : 500;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "관심종목 추가 중 오류가 발생했습니다." },
      { status },
    );
  }
}
