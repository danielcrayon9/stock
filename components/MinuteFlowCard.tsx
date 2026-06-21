import { formatKRW, formatScore } from "@/lib/formatters";
import type { MinuteFlowCheck } from "@/lib/intradayTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  stockCode?: string;
  stockName?: string;
  score?: number | null;
  checks?: MinuteFlowCheck[];
  barCount?: number;
  latestClose?: number | null;
  latestVwap?: number | null;
  latestMa20?: number | null;
  dataSource?: string;
};

function checkTone(check: MinuteFlowCheck): string {
  if (check.passed == null) return "text-slate-500 bg-slate-50";
  if (check.scoreDelta < 0 && check.passed) return "text-rose-700 bg-rose-50";
  if (check.scoreDelta > 0 && check.passed) return "text-emerald-700 bg-emerald-50";
  return "text-slate-600 bg-slate-50";
}

export default function MinuteFlowCard({
  stockCode,
  stockName,
  score = null,
  checks = [],
  barCount,
  latestClose,
  latestVwap,
  latestMa20,
  dataSource,
}: Props) {
  const defaultChecks: MinuteFlowCheck[] = [
    { id: "vwap", label: "5분봉 VWAP 위", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "ma20", label: "5분봉 20MA 위", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "lows", label: "최근 3개 5분봉 저점 상승", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "highs", label: "최근 3개 5분봉 고점 상승", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "breakout", label: "전고점 돌파 후 안착", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "volume", label: "장대양봉 후 거래량 유지", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "vwap-break", label: "VWAP 이탈", passed: null, scoreDelta: -15, detail: "분석 대기" },
    { id: "ma20-break", label: "5분봉 20MA 이탈", passed: null, scoreDelta: -10, detail: "분석 대기" },
    { id: "highs-down", label: "분봉상 고점 하락", passed: null, scoreDelta: -10, detail: "분석 대기" },
  ];

  const items = checks.length > 0 ? checks : defaultChecks;

  return (
    <Card>
      <CardHeader>
        <CardTitle>분봉 흐름 분석 (2단계)</CardTitle>
        <CardDescription>
          5분봉 기준 VWAP·20MA·고점/저점 상승·돌파·거래량 유지·이탈 경고를 점수화합니다.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {stockCode ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">
              {stockName ?? stockCode} · 분봉 {score == null ? "대기" : formatScore(score)}점
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {barCount != null ? `${barCount}개 5분봉` : "5분봉"} · 현재가 {formatKRW(latestClose)}
              {latestVwap != null ? ` · VWAP ${formatKRW(latestVwap)}` : ""}
              {latestMa20 != null ? ` · 20MA ${formatKRW(latestMa20)}` : ""}
            </p>
            {dataSource ? <p className="mt-1 text-xs text-amber-700">{dataSource}</p> : null}
          </div>
        ) : null}
        <div className="grid gap-2 text-sm">
          {items.map((check) => (
            <div key={check.id} className={`rounded-xl px-3 py-2 font-semibold ${checkTone(check)}`}>
              <div className="flex items-center justify-between gap-2">
                <span>{check.label}</span>
                <span className="text-xs">
                  {check.passed == null ? "—" : check.scoreDelta > 0 ? (check.passed ? `+${check.scoreDelta}` : "0") : check.passed ? check.scoreDelta : "0"}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-normal opacity-80">{check.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
