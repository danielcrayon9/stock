import { NextRequest, NextResponse } from "next/server";
import { appendRow, GoogleSheetsConfigError } from "@/lib/googleSheets";
import { DEFAULT_TARGET_PROFIT_RATE } from "@/lib/constants";
import { nowIso } from "@/lib/utils";

export const dynamic = "force-dynamic";

function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const stockCode = String(body.stockCode ?? "").trim();
    const stockName = String(body.stockName ?? "").trim();

    if (!stockCode || !stockName) {
      return NextResponse.json({ ok: false, error: "종목코드와 종목명이 필요합니다." }, { status: 400 });
    }

    const now = nowIso();
    // 보유 후보: 아직 매수하지 않은 상태이므로 수량/평단은 0으로 등록한다.
    const row = {
      id: crypto.randomUUID(),
      stockCode,
      stockName,
      buyDate: "",
      avgBuyPrice: 0,
      quantity: 0,
      investedAmount: 0,
      targetProfitRate: Number(body.targetProfitRate) || DEFAULT_TARGET_PROFIT_RATE,
      stopLossRate: 0,
      targetPrice: toNumber(body.targetPrice1),
      stopLossPrice: toNumber(body.stopLossPrice),
      currentPrice: toNumber(body.currentPrice),
      profitAmount: 0,
      profitRate: 0,
      memo: "시장 스캐너 보유 후보 (미매수)",
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    await appendRow("portfolio", row);
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (error) {
    const status = error instanceof GoogleSheetsConfigError ? 503 : 500;
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "보유 후보 등록 중 오류가 발생했습니다." },
      { status },
    );
  }
}
