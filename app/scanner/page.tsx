import MarketScannerForm from "@/components/MarketScannerForm";
import { getLatestScanRun, getRecommendations, getScanResults } from "@/lib/scanStore";
import type { ScanRunResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getInitial(): Promise<ScanRunResponse | null> {
  try {
    const run = await getLatestScanRun();
    if (!run) return null;
    const [results, recommendations] = await Promise.all([
      getScanResults(run.id),
      getRecommendations(run.id),
    ]);
    return { run, results, recommendations, cached: true, message: "가장 최근 스캔 결과입니다." };
  } catch {
    return null;
  }
}

export default async function ScannerPage() {
  const initial = await getInitial();

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">시장 스캐너</h1>
        <p className="mt-2 text-slate-500">
          KOSPI 200과 KOSDAQ 상위 후보를 자동으로 분석해 현재 매수 가능성이 높은 종목을 선별합니다. 종목을 직접 입력할 필요가 없습니다.
        </p>
      </div>
      <MarketScannerForm initial={initial} />
    </>
  );
}
