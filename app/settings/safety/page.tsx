import SafetyStatusCard from "@/components/SafetyStatusCard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSafetyStatus, READ_ONLY_DISCLAIMER } from "@/lib/safetyGuard";

export const dynamic = "force-dynamic";

export default function SafetySettingsPage() {
  const status = getSafetyStatus();

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">안전 설정</h1>
        <p className="mt-2 text-slate-500">실전투자 API 키를 사용해도 이 시스템은 조회, 분석, 추천, 알림 전용으로만 동작합니다.</p>
      </div>
      <SafetyStatusCard />
      <Card>
        <CardHeader>
          <CardTitle>필수 안전 환경변수</CardTitle>
          <CardDescription>아래 값이 read-only 정책을 강제합니다.</CardDescription>
        </CardHeader>
        <div className="grid gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 p-3"><code>KIS_MODE=real</code></div>
          <div className="rounded-xl bg-slate-50 p-3"><code>ENABLE_ORDER=false</code></div>
          <div className="rounded-xl bg-slate-50 p-3"><code>READ_ONLY_MODE=true</code></div>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>차단 정책</CardTitle>
          <CardDescription>이 프로젝트는 실제 계좌에 영향을 주는 기능을 포함하지 않습니다.</CardDescription>
        </CardHeader>
        <div className="space-y-4 text-sm leading-6 text-slate-600">
          <p>{READ_ONLY_DISCLAIMER}</p>
          <div>
            <p className="font-bold text-slate-950">차단된 기능 범위</p>
            <p>{status.blockedCapabilities.join(", ")}</p>
          </div>
          <p className="rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
            API Key, App Secret, Approval Key, 계좌번호는 UI, console.log, error log에 출력하지 않습니다. `.env.local`은 GitHub에 올리지 않습니다.
          </p>
        </div>
      </Card>
    </>
  );
}
