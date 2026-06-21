import { formatPercent, formatScore } from "@/lib/formatters";
import type { MarketIndexCheck, MarketIndexSnapshot } from "@/lib/intradayTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  indexes: MarketIndexSnapshot[];
  score?: number | null;
  checks?: MarketIndexCheck[];
  breadth?: { risingStockCount: number; fallingStockCount: number } | null;
  marketTradingValueChangeRate?: number | null;
  dataSource?: string;
};

function checkTone(check: MarketIndexCheck): string {
  if (check.passed == null) return "text-slate-500 bg-slate-50";
  if (check.scoreDelta < 0 && check.passed) return "text-rose-700 bg-rose-50";
  if (check.scoreDelta > 0 && check.passed) return "text-emerald-700 bg-emerald-50";
  return "text-slate-600 bg-slate-50";
}

export default function MarketIndexCard({
  indexes,
  score = null,
  checks = [],
  breadth = null,
  marketTradingValueChangeRate = null,
  dataSource,
}: Props) {
  const displayIndexes = indexes.length > 0 ? indexes.slice(0, 4) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>시장 지수 방향 (5단계)</CardTitle>
        <CardDescription>
          KOSPI/KOSDAQ/KOSPI200·업종 지수, breadth, 시장 거래대금 추세를 점수화합니다.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {score != null ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">시장 점수 {formatScore(score)}점</p>
            {breadth ? (
              <p className="mt-1 text-xs text-slate-500">
                상승 {breadth.risingStockCount} / 하락 {breadth.fallingStockCount}
              </p>
            ) : null}
            {marketTradingValueChangeRate != null ? (
              <p className="text-xs text-slate-500">
                시장 거래대금 전일 대비 {marketTradingValueChangeRate.toFixed(1)}%
              </p>
            ) : null}
            {dataSource ? <p className="mt-1 text-xs text-amber-700">{dataSource}</p> : null}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {displayIndexes.map((item) => (
            <div key={item.indexCode} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-500">{item.indexName}</p>
              <p className="mt-1 text-base font-black text-slate-950">{item.currentValue ?? "—"}</p>
              <p className="text-xs font-semibold text-slate-600">
                {item.direction} · {formatPercent(item.changeRate)}
              </p>
            </div>
          ))}
        </div>
        {checks.length > 0 ? (
          <div className="grid gap-2 text-sm">
            {checks.map((check) => (
              <div key={check.id} className={`rounded-xl px-3 py-2 font-semibold ${checkTone(check)}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs">{check.label}</span>
                  <span className="text-xs">
                    {check.passed == null
                      ? "—"
                      : check.scoreDelta > 0
                        ? check.passed
                          ? `+${check.scoreDelta}`
                          : "0"
                        : check.passed
                          ? check.scoreDelta
                          : "0"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-normal opacity-80">{check.detail}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
