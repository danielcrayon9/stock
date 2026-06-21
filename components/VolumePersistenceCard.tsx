"use client";

import { formatScore } from "@/lib/formatters";
import type { VolumePersistenceCheck } from "@/lib/intradayTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  stockCode?: string;
  stockName?: string;
  score?: number | null;
  checks?: VolumePersistenceCheck[];
  sameTimeRatio?: number | null;
  dataSource?: string;
};

function checkTone(check: VolumePersistenceCheck): string {
  if (check.passed == null) return "text-slate-500 bg-slate-50";
  if (check.scoreDelta < 0 && check.passed) return "text-rose-700 bg-rose-50";
  if (check.scoreDelta > 0 && check.passed) return "text-emerald-700 bg-emerald-50";
  return "text-slate-600 bg-slate-50";
}

export default function VolumePersistenceCard({
  stockCode,
  stockName,
  score = null,
  checks = [],
  sameTimeRatio = null,
  dataSource,
}: Props) {
  const defaultChecks: VolumePersistenceCheck[] = [
    { id: "same-time", label: "전일 동시간 대비 2배+", passed: null, scoreDelta: 15, detail: "분석 대기" },
    { id: "15m", label: "최근 15분 거래대금 증가", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "30m", label: "30분 가격↑ + 거래대금 유지", passed: null, scoreDelta: 15, detail: "분석 대기" },
    { id: "sideways", label: "거래대금↑ 후 가격 횡보", passed: null, scoreDelta: 5, detail: "분석 대기" },
    { id: "tv-down", label: "거래대금↑ 후 가격↓", passed: null, scoreDelta: -15, detail: "분석 대기" },
    { id: "wick", label: "거래대금 급증 + 긴 윗꼬리", passed: null, scoreDelta: -20, detail: "분석 대기" },
    { id: "diverge", label: "가격↑ 중 거래대금↓", passed: null, scoreDelta: -10, detail: "분석 대기" },
  ];

  const items = checks.length > 0 ? checks : defaultChecks;

  return (
    <Card>
      <CardHeader>
        <CardTitle>거래대금 지속성 (3단계)</CardTitle>
        <CardDescription>
          전일 동시간 대비 비율, 15/30분 추세, 급증 후 횡보·되밀림·윗꼬리 패턴을 점수화합니다.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {stockCode ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">
              {stockName ?? stockCode} · 지속성 {score == null ? "대기" : formatScore(score)}점
            </p>
            {sameTimeRatio != null ? (
              <p className="mt-1 text-xs text-slate-500">전일 동시간 대비 {sameTimeRatio.toFixed(2)}배</p>
            ) : null}
            {dataSource ? <p className="mt-1 text-xs text-amber-700">{dataSource}</p> : null}
          </div>
        ) : null}
        <div className="grid gap-2 text-sm">
          {items.map((check) => (
            <div key={check.id} className={`rounded-xl px-3 py-2 font-semibold ${checkTone(check)}`}>
              <div className="flex items-center justify-between gap-2">
                <span>{check.label}</span>
                <span className="text-xs">
                  {check.passed == null
                    ? "—"
                    : check.scoreDelta > 0
                      ? check.passed
                        ? `+${check.scoreDelta}`
                        : "0"
                      : check.passed
                        ? check.scoreDelta
                        : "0"}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-normal opacity-80">{check.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
