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
