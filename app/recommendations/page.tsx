import Link from "next/link";
import RecommendationTable from "@/components/RecommendationTable";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getLatestScanRun, getScanResults } from "@/lib/scanStore";
import { formatDateTime } from "@/lib/formatters";
import type { ScanResultRow, ScanRun } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getData(): Promise<{ run: ScanRun | null; results: ScanResultRow[] }> {
  try {
    const run = await getLatestScanRun();
    if (!run) return { run: null, results: [] };
    const results = await getScanResults(run.id);
    return { run, results };
  } catch {
    return { run: null, results: [] };
  }
}

export default async function RecommendationsPage() {
  const { run, results } = await getData();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black">추천 종목</h1>
          <p className="mt-2 text-slate-500">
            최근 스캔 결과를 추천 유형별로 분류해 보여줍니다. 추천 종목은 매수 확정이 아니라 분석상 관심 후보입니다.
          </p>
        </div>
        <Link href="/scanner">
          <Button variant="secondary">시장 스캐너로 이동</Button>
        </Link>
      </div>

      {run ? (
        <Card>
          <CardHeader>
            <CardTitle>데이터 기준</CardTitle>
            <CardDescription>
              대상: {run.universeType} · 분석 종목 {run.totalScanned}개 · 추천 {run.totalRecommended}개 · 분석 시각 {formatDateTime(run.finishedAt)}
            </CardDescription>
          </CardHeader>
          <p className="text-xs text-slate-400">
            현재가가 매수가보다 높으면 추격매수 주의로 표시됩니다. 모든 결과는 데이터 기준일과 분석 시간을 함께 확인하세요.
          </p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>아직 추천 결과가 없습니다</CardTitle>
            <CardDescription>
              시장 스캐너에서 스캔을 실행하면 추천 종목이 여기에 표시됩니다. Google Sheets 환경변수가 설정되어야 결과가 저장됩니다.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <RecommendationTable results={results} />
    </>
  );
}
