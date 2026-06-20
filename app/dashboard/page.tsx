import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ScoreCard from "@/components/ScoreCard";
import { getRows, GoogleSheetsConfigError } from "@/lib/googleSheets";
import { getLatestScanRun } from "@/lib/scanStore";
import { formatDateTime } from "@/lib/formatters";

type AnalysisRow = {
  stockCode?: string;
  stockName?: string;
  riskScore?: string | number;
  finalOpinion?: string;
  summary?: string;
  analyzedAt?: string;
};

async function getDashboardData() {
  try {
    const [watchlist, portfolio, analyses, alerts] = await Promise.all([
      getRows("watchlist"),
      getRows("portfolio"),
      getRows<AnalysisRow>("analysis_results"),
      getRows("alert_logs"),
    ]);
    const highRisk = analyses
      .filter((item) => Number(item.riskScore) >= 70)
      .sort((left, right) => String(right.analyzedAt ?? "").localeCompare(String(left.analyzedAt ?? "")))
      .slice(0, 5);

    return {
      watchlistCount: watchlist.length,
      portfolioCount: portfolio.length,
      analysisCount: analyses.length,
      alertCount: alerts.length,
      highRisk,
      message: "",
    };
  } catch (error) {
    const message =
      error instanceof GoogleSheetsConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "대시보드 데이터를 불러오지 못했습니다.";
    return {
      watchlistCount: null,
      portfolioCount: null,
      analysisCount: null,
      alertCount: null,
      highRisk: [] as AnalysisRow[],
      message,
    };
  }
}

export default async function DashboardPage() {
  const [data, latestScan] = await Promise.all([getDashboardData(), getLatestScanRun().catch(() => null)]);

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">대시보드</h1>
        <p className="mt-2 text-slate-500">시장 스캔, 저장된 종목, 분석 결과, 알림 로그 상태를 요약합니다.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard label="관심종목" score={data.watchlistCount} />
        <ScoreCard label="보유종목" score={data.portfolioCount} />
        <ScoreCard label="분석 결과" score={data.analysisCount} />
        <ScoreCard label="알림 로그" score={data.alertCount} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 시장 스캔</CardTitle>
          <CardDescription>
            {latestScan
              ? `대상 ${latestScan.universeType} · 분석 ${latestScan.totalScanned}개 · 추천 ${latestScan.totalRecommended}개 · ${formatDateTime(latestScan.finishedAt)}`
              : "아직 저장된 스캔 결과가 없습니다. 시장 스캐너에서 스캔을 실행하세요."}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/scanner" className="rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white">
            시장 스캐너 열기
          </Link>
          <Link href="/recommendations" className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700">
            추천 종목 보기
          </Link>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>서비스 상태</CardTitle>
          <CardDescription>
            {data.message ||
              "Google Sheets, 시세 API, 공시/뉴스/AI/Telegram 기능은 환경변수 설정 여부에 따라 독립적으로 동작합니다."}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>리스크 높은 최근 분석</CardTitle>
          <CardDescription>최근 저장된 분석 결과 중 리스크 점수 70점 이상인 종목입니다.</CardDescription>
        </CardHeader>
        <div className="grid gap-3">
          {data.highRisk.length > 0 ? (
            data.highRisk.map((item) => (
              <div key={`${item.stockCode}-${item.analyzedAt}`} className="rounded-xl border border-slate-100 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-slate-950">
                    {item.stockName || "종목명 없음"} {item.stockCode ? `(${item.stockCode})` : ""}
                  </p>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                    리스크 {item.riskScore ?? "데이터 부족"}점
                  </span>
                </div>
                <p className="mt-2 text-slate-600">{item.summary || item.finalOpinion || "요약 데이터 부족"}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-500">리스크 높은 분석 결과가 아직 없습니다.</p>
          )}
        </div>
      </Card>
    </>
  );
}
