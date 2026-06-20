import { NextRequest, NextResponse } from "next/server";
import { appendRow, deleteRowById, getRows, GoogleSheetsConfigError, updateRowById } from "@/lib/googleSheets";
import { DEFAULT_TARGET_PROFIT_RATE } from "@/lib/constants";
import { nowIso } from "@/lib/utils";

const SHEET_NAME = "watchlist";

function toNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  const status = error instanceof GoogleSheetsConfigError ? 503 : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
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
    const row = {
      id: crypto.randomUUID(),
      stockCode: String(body.stockCode ?? "").trim(),
      stockName: String(body.stockName ?? "").trim(),
      market: String(body.market ?? "UNKNOWN").trim(),
      targetProfitRate: toNumber(body.targetProfitRate, DEFAULT_TARGET_PROFIT_RATE),
      memo: String(body.memo ?? "").trim(),
      lastAnalyzedAt: "",
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    if (!row.stockCode || !row.stockName) {
      return NextResponse.json({ ok: false, error: "종목코드와 종목명은 필수입니다." }, { status: 400 });
    }

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

    const updated = await updateRowById(SHEET_NAME, id, {
      stockCode: String(body.stockCode ?? "").trim(),
      stockName: String(body.stockName ?? "").trim(),
      market: String(body.market ?? "UNKNOWN").trim(),
      targetProfitRate: toNumber(body.targetProfitRate, DEFAULT_TARGET_PROFIT_RATE),
      memo: String(body.memo ?? "").trim(),
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
