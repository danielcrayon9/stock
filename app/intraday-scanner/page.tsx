import IntradayScannerPanel from "@/components/IntradayScannerPanel";
import MarketIndexCard from "@/components/MarketIndexCard";
import MinuteFlowCard from "@/components/MinuteFlowCard";
import OrderbookGapCard from "@/components/OrderbookGapCard";
import SafetyStatusCard from "@/components/SafetyStatusCard";
import { getIntradaySnapshot } from "@/lib/intradayScanner";

export const dynamic = "force-dynamic";

export default async function IntradayScannerPage() {
  const snapshot = await getIntradaySnapshot();

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
      <div className="grid gap-4 lg:grid-cols-3">
        <MinuteFlowCard />
        <OrderbookGapCard />
        <MarketIndexCard indexes={snapshot.marketIndexes} />
      </div>
      <IntradayScannerPanel initial={snapshot} />
    </>
  );
}
