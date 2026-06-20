import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKRW } from "@/lib/formatters";
import type { EntryPriceResult, EntryPriceScenario } from "@/lib/types";

function formatRatio(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "데이터 부족";
  return `1:${value.toFixed(2)}`;
}

function suitabilityClassName(value: EntryPriceScenario["suitability"]) {
  if (value === "적합") return "bg-emerald-100 text-emerald-700";
  if (value === "분할 접근") return "bg-cyan-100 text-cyan-700";
  if (value === "관망") return "bg-amber-100 text-amber-700";
  if (value === "부적합") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function scenarioTitle(label: EntryPriceScenario["label"]) {
  if (label === "보수적") return "눌림 매수가";
  if (label === "중립적") return "기준 매수가";
  return "현재가/돌파 접근가";
}

function ScenarioCard({ scenario }: { scenario: EntryPriceScenario }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-500">{scenarioTitle(scenario.label)}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{formatKRW(scenario.buyPrice)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${suitabilityClassName(scenario.suitability)}`}>
          {scenario.suitability}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">목표가</p>
          <p className="mt-1 font-bold text-slate-900">{formatKRW(scenario.targetPrice)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">손절가</p>
          <p className="mt-1 font-bold text-slate-900">{formatKRW(scenario.stopLossPrice)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">예상수익</p>
          <p className="mt-1 font-bold text-red-600">{formatKRW(scenario.expectedProfit)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-slate-500">예상손실</p>
          <p className="mt-1 font-bold text-blue-600">{formatKRW(scenario.expectedLoss)}</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl border border-slate-100 p-3">
        <p className="text-sm font-semibold text-slate-700">손익비 {formatRatio(scenario.riskRewardRatio)}</p>
        <ul className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
          {scenario.reasoning.map((reason, index) => (
            <li key={`${index}-${reason}`}>- {reason}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function BuyPriceCard({ result }: { result: EntryPriceResult }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>룰 기반 매수가 제시</CardTitle>
            <CardDescription>
              AI 판단 전 코드 기반 계산입니다. 손절가와 손익비가 불리하면 관망 또는 매수금지로 표시합니다.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
              {result.finalOpinionBase}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${suitabilityClassName(result.entrySuitability)}`}>
              {result.entrySuitability}
            </span>
          </div>
        </div>
      </CardHeader>

      {result.scenarios.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {result.warningMessage}
        </div>
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-3">
            {result.scenarios.map((scenario) => (
              <ScenarioCard key={scenario.label} scenario={scenario} />
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">공통 손절가</p>
              <p className="mt-1 text-lg font-black text-blue-700">{formatKRW(result.stopLossPrice)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">1차 목표가</p>
              <p className="mt-1 text-lg font-black text-red-700">{formatKRW(result.targetPrice1)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">2차 목표가</p>
              <p className="mt-1 text-lg font-black text-red-700">{formatKRW(result.targetPrice2)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">최고 손익비</p>
              <p className="mt-1 text-lg font-black text-slate-950">{formatRatio(result.riskRewardRatio)}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-bold">{result.warningMessage}</p>
            <ul className="mt-2 space-y-1">
              {result.reasoning.map((reason, index) => (
                <li key={`${index}-${reason}`}>- {reason}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </Card>
  );
}
