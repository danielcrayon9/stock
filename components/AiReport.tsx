import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKRW } from "@/lib/formatters";
import type { AiJudgeResult } from "@/lib/types";

function opinionClassName(opinion: AiJudgeResult["finalOpinion"]) {
  if (opinion === "매수 가능") return "bg-emerald-100 text-emerald-700";
  if (opinion === "분할매수") return "bg-cyan-100 text-cyan-700";
  if (opinion === "관망") return "bg-amber-100 text-amber-700";
  if (opinion === "위험") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function riskClassName(riskLevel: AiJudgeResult["riskLevel"]) {
  if (riskLevel === "낮음") return "bg-emerald-100 text-emerald-700";
  if (riskLevel === "보통") return "bg-cyan-100 text-cyan-700";
  if (riskLevel === "주의") return "bg-amber-100 text-amber-700";
  if (riskLevel === "높음") return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

function ratio(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "데이터 부족";
  return `1:${value.toFixed(2)}`;
}

export default function AiReport({
  result,
  loading = false,
  onRun,
}: {
  result: AiJudgeResult | null;
  loading?: boolean;
  onRun: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>AI 종합 판단</CardTitle>
            <CardDescription>
              기술적 분석, 거래대금, 공시, 뉴스, 실적, 매수가 계산 결과를 AI에 전달해 JSON 리포트로 표시합니다.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={onRun}
            disabled={loading}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "AI 판단 중..." : "AI 종합 판단 실행"}
          </button>
        </div>
      </CardHeader>

      {!result ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          버튼을 누르면 AI 판단을 실행합니다. API 키가 없거나 실패하면 룰 기반 fallback 결과가 표시됩니다.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${opinionClassName(result.finalOpinion)}`}>
              최종 의견: {result.finalOpinion}
            </span>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${riskClassName(result.riskLevel)}`}>
              리스크: {result.riskLevel}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
              신뢰도: {result.confidence}%
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
              {result.source === "fallback" ? "룰 기반 fallback" : "AI 응답"}
            </span>
          </div>

          <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{result.summary}</p>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">보수 매수가</p>
              <p className="mt-1 font-black text-slate-950">{formatKRW(result.conservativeBuyPrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">중립 매수가</p>
              <p className="mt-1 font-black text-slate-950">{formatKRW(result.neutralBuyPrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">공격 매수가</p>
              <p className="mt-1 font-black text-slate-950">{formatKRW(result.aggressiveBuyPrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">손익비</p>
              <p className="mt-1 font-black text-slate-950">{ratio(result.riskRewardRatio)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">손절가</p>
              <p className="mt-1 font-black text-blue-700">{formatKRW(result.stopLossPrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">1차 목표가</p>
              <p className="mt-1 font-black text-red-700">{formatKRW(result.targetPrice1)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">2차 목표가</p>
              <p className="mt-1 font-black text-red-700">{formatKRW(result.targetPrice2)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">상태</p>
              <p className="mt-1 font-black text-slate-950">{result.status}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="font-bold text-slate-950">긍정 요인</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {result.positiveFactors.length > 0 ? (
                  result.positiveFactors.map((factor, index) => <li key={`${index}-${factor}`}>- {factor}</li>)
                ) : (
                  <li>데이터 부족</li>
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-100 p-4">
              <p className="font-bold text-slate-950">부정 요인</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                {result.negativeFactors.length > 0 ? (
                  result.negativeFactors.map((factor, index) => <li key={`${index}-${factor}`}>- {factor}</li>)
                ) : (
                  <li>데이터 부족</li>
                )}
              </ul>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">진입 전략</p>
              <p className="mt-2">{result.entryStrategy}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <p className="font-bold text-slate-950">리스크 관리</p>
              <p className="mt-2">{result.riskManagement}</p>
            </div>
          </div>

          <p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{result.warningMessage}</p>
          <p className="text-xs text-slate-500">{result.message}</p>
        </div>
      )}
    </Card>
  );
}
