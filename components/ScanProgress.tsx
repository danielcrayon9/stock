"use client";

import { Loader2 } from "lucide-react";

type ScanProgressProps = {
  percent: number;
  currentName: string | null;
  message: string;
};

export default function ScanProgress({ percent, currentName, message }: ScanProgressProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Loader2 className="h-4 w-4 animate-spin" />
        스캔 진행 중... {clamped}%
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-slate-950 transition-all duration-300" style={{ width: `${clamped}%` }} />
      </div>
      <p className="mt-3 text-sm text-slate-500">
        {currentName ? `분석 중: ${currentName}` : message}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        룰 기반 1차 분석 후 상위 후보만 공시·뉴스·실적·AI 분석을 수행합니다. 종목 수에 따라 시간이 걸릴 수 있습니다.
      </p>
    </div>
  );
}
