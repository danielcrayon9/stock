import Link from "next/link";
import SafetyStatusCard from "@/components/SafetyStatusCard";
import SettingsForm from "@/components/SettingsForm";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEnvStatus } from "@/lib/googleSheets";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const envStatus = getEnvStatus();
  const configured = envStatus.filter((item) => item.configured).length;

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">설정</h1>
        <p className="mt-2 text-slate-500">API 키는 브라우저에 노출하지 않고 서버 환경변수로만 관리합니다.</p>
      </div>
      <SafetyStatusCard />
      <Card>
        <CardHeader>
          <CardTitle>한국투자증권 API 설정 안내</CardTitle>
          <CardDescription>
            KIS 실전투자 API 키를 사용하더라도 이 앱은 현재가, 분봉, 기간별 시세, 호가, 지수 조회 전용으로만 사용합니다.
            실제 주문 기능은 제공하지 않으며 계좌 잔고에는 영향을 주지 않습니다.
          </CardDescription>
        </CardHeader>
        <div className="space-y-2 px-6 pb-6 text-sm leading-6 text-slate-600">
          <p>
            현재 시스템은 한국투자증권 KIS API를 조회 전용으로 사용합니다. 현재가, 분봉, 호가, 지수 조회만 수행하며
            실제 매수·매도 주문은 실행하지 않습니다.
          </p>
          <p>
            <code>KIS_APP_KEY</code>, <code>KIS_APP_SECRET</code>는 서버 환경변수에만 저장합니다. API Key, App Secret,
            Approval Key, 계좌번호는 UI에 표시하지 않습니다.
          </p>
          <p>
            <code>ENABLE_ORDER=false</code>, <code>READ_ONLY_MODE=true</code>가 안전 기본값입니다. 연결 상태는{" "}
            <code>/api/kis/health</code>에서 확인할 수 있습니다.
          </p>
          <Link href="/settings/safety" className="font-bold text-slate-950 underline">
            안전 정책 상세 보기
          </Link>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>환경변수 체크</CardTitle>
          <CardDescription>
            {envStatus.length}개 중 {configured}개가 설정되어 있습니다. `.env.local`은 GitHub에 올리지 않습니다.
          </CardDescription>
        </CardHeader>
        <SettingsForm envStatus={envStatus} />
      </Card>
    </>
  );
}
