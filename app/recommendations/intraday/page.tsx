import Link from "next/link";
import IntradayRecommendationTable from "@/components/IntradayRecommendationTable";
import SafetyStatusCard from "@/components/SafetyStatusCard";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getIntradaySnapshot } from "@/lib/intradayScanner";
import { formatDateTime } from "@/lib/formatters";

export const dynamic = "force-dynamic";

export default async function IntradayRecommendationsPage() {
  const snapshot = await getIntradaySnapshot();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">장중 추천 후보</h1>
          <p className="mt-2 text-slate-500">장중 룰 기반 점수와 AI 판단 결과를 표시할 조회 전용 추천 화면입니다.</p>
        </div>
        <Link href="/intraday-scanner">
          <Button variant="secondary">장중 스캐너로 이동</Button>
        </Link>
      </div>
      <SafetyStatusCard />
      <Card>
        <CardHeader>
          <CardTitle>데이터 기준</CardTitle>
          <CardDescription>
            상태: {snapshot.status} · 출처: {snapshot.source} · 생성 시각 {formatDateTime(snapshot.generatedAt)}
          </CardDescription>
        </CardHeader>
        <p className="text-xs text-slate-500">{snapshot.message}</p>
      </Card>
      <IntradayRecommendationTable candidates={snapshot.candidates} />
    </>
  );
}
