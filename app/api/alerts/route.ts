import { NextRequest, NextResponse } from "next/server";
import { appendRow, deleteRowById, getRows, GoogleSheetsConfigError, updateRowById } from "@/lib/googleSheets";
import { normalizeAlertType, sendTestAlert } from "@/lib/alertService";
import { nowIso } from "@/lib/utils";

const SHEET_NAME = "alert_settings";

function toBoolean(value: unknown) {
  return value === true || value === "true" || value === "TRUE" || value === "on";
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
}

function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  const status = error instanceof GoogleSheetsConfigError ? 503 : 500;
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(request: NextRequest) {
  try {
    if (request.nextUrl.searchParams.get("test") === "true") {
      const data = await sendTestAlert();
      return NextResponse.json({ ok: data.ok, data, error: data.ok ? undefined : data.error });
    }

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
      type: normalizeAlertType(String(body.type ?? "target_profit")),
      enabled: body.enabled == null ? true : toBoolean(body.enabled),
      stockCode: String(body.stockCode ?? "").trim(),
      stockName: String(body.stockName ?? "").trim(),
      condition: String(body.condition ?? "").trim(),
      targetValue: toNumber(body.targetValue),
      channel: "telegram",
      createdAt: now,
      updatedAt: now,
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

    const updated = await updateRowById(SHEET_NAME, id, {
      type: normalizeAlertType(String(body.type ?? "target_profit")),
      enabled: body.enabled == null ? true : toBoolean(body.enabled),
      stockCode: String(body.stockCode ?? "").trim(),
      stockName: String(body.stockName ?? "").trim(),
      condition: String(body.condition ?? "").trim(),
      targetValue: toNumber(body.targetValue),
      channel: "telegram",
      updatedAt: nowIso(),
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
