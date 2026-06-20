import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/formatters";
import type { MarketIndexSnapshot } from "@/lib/intradayTypes";

export default function MarketIndexCard({ indexes }: { indexes: MarketIndexSnapshot[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>시장 지수 방향</CardTitle>
        <CardDescription>KOSPI/KOSDAQ/KOSPI200 및 업종 지수 방향을 장중 판단에 반영할 준비 영역입니다.</CardDescription>
      </CardHeader>
      <div className="grid gap-3 md:grid-cols-3">
        {indexes.map((item) => (
          <div key={item.indexCode} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-500">{item.indexName}</p>
            <p className="mt-1 text-lg font-black text-slate-950">{item.currentValue ?? "데이터 대기"}</p>
            <p className="text-sm font-semibold text-slate-600">{item.direction} · {formatPercent(item.changeRate)}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
