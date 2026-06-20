import { READ_ONLY_DISCLAIMER } from "@/lib/safetyGuard";
import { getWorkerIntradaySnapshot } from "@/lib/realtimeClient";
import type { IntradayCandidate, IntradayRecommendationType, IntradayScanSnapshot } from "@/lib/intradayTypes";
import type { ScanTarget } from "@/lib/types";

function recommendationFromScore(score: number | null): IntradayRecommendationType {
  if (score == null) return "관망";
  if (score >= 85) return "장중 강한 매수 후보";
  if (score >= 75) return "분할매수 후보";
  if (score >= 65) return "눌림목 대기 후보";
  if (score >= 50) return "관망";
  return "제외";
}

function createSampleCandidate(index: number, overrides: Partial<IntradayCandidate>): IntradayCandidate {
  const score = overrides.intradayTotalScore ?? null;
  const now = new Date().toISOString();
  return {
    id: `intraday-sample-${index}`,
    rank: index,
    stockCode: "",
    stockName: "",
    market: "KOSPI",
    currentPrice: null,
    changeRate: null,
    tradingValue: null,
    minuteFlowScore: null,
    volumePersistenceScore: null,
    orderbookScore: null,
    todayNewsScore: null,
    marketIndexScore: null,
    technicalScore: null,
    dailyTrendScore: null,
    riskPenalty: 0,
    intradayTotalScore: score,
    recommendationType: recommendationFromScore(score),
    entryTiming: "눌림 대기",
    entryPriceRange: "실시간 worker 연결 후 산출",
    stopLossPrice: null,
    targetPrice1: null,
    targetPrice2: null,
    riskRewardRatio: null,
    minuteFlowSummary: "5분봉 VWAP, 20MA, 고점/저점 상승 여부를 표시할 준비 상태입니다.",
    volumePersistenceSummary: "거래대금 지속성은 realtime-worker 연결 후 계산합니다.",
    orderbookSummary: "호가 잔량과 상방/하방 공백은 조회 전용 worker에서 제공됩니다.",
    marketIndexSummary: "KOSPI/KOSDAQ/KOSPI200 방향은 시장 지수 API 연결 후 반영됩니다.",
    todayNewsSummary: "당일 뉴스는 발행 시간 기준으로 분리해 반영할 예정입니다.",
    positiveFactors: ["조회 전용 장중 분석 UI 준비"],
    negativeFactors: ["실시간 worker 미연결 시 실데이터 없음"],
    riskManagement: "실제 주문은 실행되지 않으며, 관심 후보 검토용으로만 사용합니다.",
    summary: "1단계 UI/데이터 타입 준비 상태입니다.",
    warningMessage: READ_ONLY_DISCLAIMER,
    updatedAt: now,
    ...overrides,
  };
}

export function createFallbackIntradaySnapshot(target: ScanTarget = "KOSPI200_KOSDAQ100"): IntradayScanSnapshot {
  const now = new Date().toISOString();
  const candidates = [
    createSampleCandidate(1, {
      stockCode: "005930",
      stockName: "삼성전자",
      market: "KOSPI",
      currentPrice: 0,
      intradayTotalScore: 0,
      recommendationType: "관망",
      summary: "실시간 데이터 연결 전 샘플 행입니다. 추천 판단으로 사용하지 마세요.",
    }),
    createSampleCandidate(2, {
      stockCode: "035720",
      stockName: "카카오",
      market: "KOSPI",
      currentPrice: 0,
      intradayTotalScore: 0,
      recommendationType: "관망",
      summary: "분봉/호가/체결 worker 연결 후 장중 점수가 표시됩니다.",
    }),
  ];

  return {
    id: `intraday-fallback-${now}`,
    target,
    status: "worker-not-configured",
    source: "fallback",
    generatedAt: now,
    message: "REALTIME_WORKER_URL이 설정되지 않아 장중 실시간 데이터는 아직 연결되지 않았습니다.",
    safetyMessage: "read-only 조회 전용 모드입니다. 실제 주문은 실행되지 않습니다.",
    marketIndexes: [
      {
        indexCode: "KOSPI",
        indexName: "KOSPI",
        currentValue: null,
        changeRate: null,
        direction: "데이터 부족",
        capturedAt: now,
      },
      {
        indexCode: "KOSDAQ",
        indexName: "KOSDAQ",
        currentValue: null,
        changeRate: null,
        direction: "데이터 부족",
        capturedAt: now,
      },
    ],
    candidates,
  };
}

export async function getIntradaySnapshot(target: ScanTarget = "KOSPI200_KOSDAQ100") {
  const workerSnapshot = await getWorkerIntradaySnapshot().catch(() => null);
  return workerSnapshot ?? createFallbackIntradaySnapshot(target);
}
