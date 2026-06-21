import TodayNewsCard from "@/components/TodayNewsCard";
import IntradayTotalScoreCard from "@/components/IntradayTotalScoreCard";
import VolumePersistenceCard from "@/components/VolumePersistenceCard";
import IntradayScannerPanel from "@/components/IntradayScannerPanel";
import MarketIndexCard from "@/components/MarketIndexCard";
import MinuteFlowCard from "@/components/MinuteFlowCard";
import OrderbookGapCard from "@/components/OrderbookGapCard";
import SafetyStatusCard from "@/components/SafetyStatusCard";
import { getIntradaySnapshot } from "@/lib/intradayScanner";

export const dynamic = "force-dynamic";

export default async function IntradayScannerPage() {
  const snapshot = await getIntradaySnapshot();
  const top = snapshot.candidates[0];
  const topFlow = top?.minuteFlowChecks?.length
    ? {
        stockCode: top.stockCode,
        stockName: top.stockName,
        score: top.minuteFlowScore,
        checks: top.minuteFlowChecks,
        dataSource: snapshot.source === "fallback" ? snapshot.message : undefined,
      }
    : undefined;

  const topVolume =
    top?.volumePersistenceChecks?.length
      ? {
          stockCode: top.stockCode,
          stockName: top.stockName,
          score: top.volumePersistenceScore,
          checks: top.volumePersistenceChecks,
          sameTimeRatio: top.sameTimeTradingValueRatio,
          dataSource: snapshot.source === "fallback" ? snapshot.message : undefined,
        }
      : undefined;

  const topOrderbook =
    top?.orderbookChecks?.length
      ? {
          stockCode: top.stockCode,
          stockName: top.stockName,
          score: top.orderbookScore,
          checks: top.orderbookChecks,
          metrics: top.orderbookMetrics,
          dataSource: snapshot.source === "fallback" ? snapshot.message : undefined,
        }
      : undefined;

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">장중 실전 매수 판단 스캐너</h1>
        <p className="mt-2 text-slate-500">
          KOSPI 200과 KOSDAQ 상위 100 후보군을 분봉 흐름, 거래대금 지속성, 호가 공백, 당일 뉴스, 시장 지수 방향으로 점검합니다.
        </p>
        <p className="mt-1 text-sm font-semibold text-amber-700">
          자동매매와 실제 주문 기능은 제공하지 않습니다. 추천 결과는 투자 판단 보조용입니다.
        </p>
      </div>
      <SafetyStatusCard />
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <MinuteFlowCard
          stockCode={topFlow?.stockCode}
          stockName={topFlow?.stockName}
          score={topFlow?.score}
          checks={topFlow?.checks}
          dataSource={topFlow?.dataSource}
        />
        <VolumePersistenceCard
          stockCode={topVolume?.stockCode}
          stockName={topVolume?.stockName}
          score={topVolume?.score}
          checks={topVolume?.checks}
          sameTimeRatio={topVolume?.sameTimeRatio}
          dataSource={topVolume?.dataSource}
        />
        <OrderbookGapCard
          stockCode={topOrderbook?.stockCode}
          stockName={topOrderbook?.stockName}
          score={topOrderbook?.score}
          checks={topOrderbook?.checks}
          metrics={topOrderbook?.metrics}
          dataSource={topOrderbook?.dataSource}
        />
        <MarketIndexCard
          indexes={snapshot.marketIndexes}
          score={top?.marketIndexScore}
          checks={top?.marketIndexChecks}
          breadth={snapshot.marketBreadth ?? null}
          marketTradingValueChangeRate={snapshot.marketTradingValueChangeRate ?? null}
          dataSource={snapshot.source === "fallback" ? snapshot.message : undefined}
        />
      </div>
      <TodayNewsCard
        stockCode={top?.stockCode}
        stockName={top?.stockName}
        score={top?.todayNewsScore}
        checks={top?.todayNewsChecks}
        highlights={top?.todayNewsHighlights}
        intradayNewsCount={top?.todayNewsHighlights?.filter((item) => item.isIntraday).length ?? 0}
        dataSource={snapshot.source === "fallback" ? snapshot.message : undefined}
      />
      <IntradayTotalScoreCard snapshot={snapshot} highlight={snapshot.topCandidates?.[0] ?? top} />
      <IntradayScannerPanel initial={snapshot} />
    </>
  );
}
