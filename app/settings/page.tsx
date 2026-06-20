import Link from "next/link";
import SafetyStatusCard from "@/components/SafetyStatusCard";
import SettingsForm from "@/components/SettingsForm";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEnvStatus } from "@/lib/googleSheets";

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
            KIS 실전투자 API 키를 사용하더라도 이 앱은 현재가, 분봉, 체결, 호가, 지수 조회 전용으로만 사용합니다.
            실제 주문 기능은 제공하지 않습니다.
          </CardDescription>
        </CardHeader>
        <div className="space-y-2 text-sm leading-6 text-slate-600">
          <p><code>KIS_APP_KEY</code>, <code>KIS_APP_SECRET</code>, <code>KIS_APPROVAL_KEY</code>는 서버 환경변수에만 저장하세요.</p>
          <p><code>ENABLE_ORDER=false</code>, <code>READ_ONLY_MODE=true</code>가 안전 기본값입니다.</p>
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
        <SettingsForm />
      </Card>
    </>
  );
}
