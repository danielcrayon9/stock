import { NextRequest, NextResponse } from "next/server";
import { appendRow, deleteRowById, getRows, GoogleSheetsConfigError, updateRowById } from "@/lib/googleSheets";
import { DEFAULT_TARGET_PROFIT_RATE } from "@/lib/constants";
import { calculatePortfolioValues } from "@/lib/portfolioMath";
import { nowIso } from "@/lib/utils";

const SHEET_NAME = "portfolio";

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toOptionalNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "TRUE" || value === "1";
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  const status = error instanceof GoogleSheetsConfigError ? 503 : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

function createPortfolioPayload(body: Record<string, unknown>) {
  const avgBuyPrice = toNumber(body.avgBuyPrice);
  const quantity = toNumber(body.quantity);
  const targetProfitRate = toNumber(body.targetProfitRate, DEFAULT_TARGET_PROFIT_RATE);
  const stopLossRate = toNumber(body.stopLossRate, 8);
  const currentPrice = toOptionalNumber(body.currentPrice);
  const brokerId = String(body.brokerId ?? "").trim();
  const applySellFee = toBoolean(body.applySellFee);
  const calculated = calculatePortfolioValues({
    avgBuyPrice,
    quantity,
    targetProfitRate,
    stopLossRate,
    currentPrice,
    brokerId,
    applySellFee,
  });

  return {
    stockCode: String(body.stockCode ?? "").trim(),
    stockName: String(body.stockName ?? "").trim(),
    buyDate: String(body.buyDate ?? "").trim(),
    avgBuyPrice,
    quantity,
    targetProfitRate,
    stopLossRate,
    memo: String(body.memo ?? "").trim(),
    ...calculated,
  };
}

export async function GET() {
  try {
    const data = await getRows(SHEET_NAME);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const now = nowIso();
    const payload = createPortfolioPayload(body);

    if (!payload.stockCode || !payload.stockName || payload.avgBuyPrice <= 0 || payload.quantity <= 0) {
      return NextResponse.json(
        { ok: false, error: "종목코드, 종목명, 평균매수가, 보유수량은 필수입니다." },
        { status: 400 },
      );
    }

    const row = {
      id: crypto.randomUUID(),
      ...payload,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    await appendRow(SHEET_NAME, row);
    return NextResponse.json({ ok: true, data: row }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "수정할 id가 필요합니다." }, { status: 400 });
    }

    const payload = createPortfolioPayload(body);
    const updated = await updateRowById(SHEET_NAME, id, {
      ...payload,
      updatedAt: nowIso(),
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error) {
    return handleError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = String(request.nextUrl.searchParams.get("id") ?? "").trim();

    if (!id) {
      return NextResponse.json({ ok: false, error: "삭제할 id가 필요합니다." }, { status: 400 });
    }

    const data = await deleteRowById(SHEET_NAME, id);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return handleError(error);
  }
}
