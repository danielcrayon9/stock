import { NextRequest, NextResponse } from "next/server";
import { judgeStockAnalysis } from "@/lib/aiJudge";
import type { AiJudgePayload } from "@/lib/types";

function isValidPayload(value: unknown): value is AiJudgePayload {
  const payload = value as Partial<AiJudgePayload>;
  return Boolean(
    payload &&
      payload.stock?.stockCode &&
      payload.stock?.stockName &&
      payload.score &&
      payload.entryPrice &&
      payload.dailyAnalysis,
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as unknown;
    if (!isValidPayload(body)) {
      return NextResponse.json({ ok: false, error: "종합 분석에 필요한 데이터가 부족합니다." }, { status: 400 });
    }

    const data = await judgeStockAnalysis(body);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "종합 분석 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
