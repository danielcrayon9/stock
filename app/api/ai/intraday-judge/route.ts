import { NextRequest, NextResponse } from "next/server";
import { READ_ONLY_DISCLAIMER } from "@/lib/safetyGuard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    stockCode?: string;
    stockName?: string;
  };

  return NextResponse.json({
    ok: true,
    data: {
      stockCode: body.stockCode ?? "",
      stockName: body.stockName ?? "",
      intradayFinalOpinion: "관망",
      confidence: 0,
      entryTiming: "눌림 대기",
      entryPriceRange: "실시간 데이터 연결 후 산출",
      stopLossPrice: 0,
      targetPrice1: 0,
      targetPrice2: 0,
      riskRewardRatio: 0,
      minuteFlowSummary: "1단계에서는 AI 연결 전 JSON 응답 형식만 검증합니다.",
      volumePersistenceSummary: "거래대금 지속성 데이터 대기 중입니다.",
      orderbookSummary: "호가 데이터 대기 중입니다.",
      marketIndexSummary: "시장 지수 데이터 대기 중입니다.",
      todayNewsSummary: "당일 뉴스 데이터 대기 중입니다.",
      positiveFactors: [],
      negativeFactors: ["실시간 데이터 미연결"],
      riskManagement: "실제 주문은 실행되지 않습니다.",
      summary: "조회 전용 장중 판단 응답 형식입니다.",
      warningMessage: READ_ONLY_DISCLAIMER,
    },
  });
}
