import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafetyStatus } from "@/lib/safetyGuard";

function Badge({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
      {children}
    </span>
  );
}

export default function SafetyStatusCard() {
  const status = getSafetyStatus();

  return (
    <Card className={status.ok ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/60"}>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Read-only 안전 상태</CardTitle>
            <CardDescription>{status.message}</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge ok={status.readOnlyMode}>READ_ONLY_MODE {status.readOnlyMode ? "true" : "false"}</Badge>
            <Badge ok={status.executionDisabled}>ENABLE_ORDER {status.executionDisabled ? "false" : "true"}</Badge>
          </div>
        </div>
      </CardHeader>
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <div className="rounded-xl bg-white/80 p-3">
          <p className="text-xs font-semibold text-slate-500">KIS 모드</p>
          <p className="mt-1 font-black text-slate-950">{status.kisMode || "real"}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <p className="text-xs font-semibold text-slate-500">증권사 API</p>
          <p className="mt-1 font-black text-slate-950">{status.kisConfigured ? "KIS 조회 키 설정됨" : "미설정"}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3">
          <p className="text-xs font-semibold text-slate-500">realtime-worker</p>
          <p className="mt-1 font-black text-slate-950">{status.realtimeWorkerConfigured ? "연결 설정됨" : "미설정"}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-600">
        이 프로젝트는 조회, 분석, 추천, 알림 전용입니다. 실제 주문 기능과 자동매매 기능은 제공하지 않습니다.
        <Link href="/settings/safety" className="ml-2 font-bold text-slate-950 underline">
          안전 설정 보기
        </Link>
      </p>
    </Card>
  );
}
