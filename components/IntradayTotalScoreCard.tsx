import { formatScore } from "@/lib/formatters";
import type { IntradayCandidate, IntradayScanSnapshot } from "@/lib/intradayTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  snapshot: Pick<
    IntradayScanSnapshot,
    "topCandidates" | "excludedCount" | "candidates" | "message"
  >;
  highlight?: IntradayCandidate | null;
};

export default function IntradayTotalScoreCard({ snapshot, highlight }: Props) {
  const top = snapshot.topCandidates ?? [];
  const analyzed = snapshot.candidates.filter((item) => item.stockCode).length;
  const excluded = snapshot.excludedCount ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>종합 점수 · 상위 후보 (7단계)</CardTitle>
        <CardDescription>
          가중 종합 점수, 강제 제외 조건, Top 10 관심 후보를 산출합니다. AI 8단계는 상위 30개만 사용합니다.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">분석 종목</p>
            <p className="font-black text-slate-950">{analyzed}개</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">강제 제외</p>
            <p className="font-black text-rose-700">{excluded}개</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <p className="text-xs text-slate-500">Top 후보</p>
            <p className="font-black text-emerald-700">{top.length}개</p>
          </div>
        </div>
        {highlight ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">
              1위 {highlight.stockName} · 종합 {formatScore(highlight.intradayTotalScore)}점 ·{" "}
              {highlight.recommendationType}
            </p>
            {highlight.scoreBreakdown ? (
              <p className="mt-1 text-xs text-slate-500">
                일봉 {highlight.scoreBreakdown.technicalPart}+{highlight.scoreBreakdown.dailyTrendPart} · 분봉{" "}
                {highlight.scoreBreakdown.minuteFlowPart} · 거래대금 {highlight.scoreBreakdown.volumePart} · 호가{" "}
                {highlight.scoreBreakdown.orderbookPart} · 뉴스 {highlight.scoreBreakdown.newsPart} · 시장{" "}
                {highlight.scoreBreakdown.marketPart}
              </p>
            ) : null}
            {highlight.exclusionReasons && highlight.exclusionReasons.length > 0 ? (
              <p className="mt-1 text-xs font-semibold text-rose-700">
                제외: {highlight.exclusionReasons.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
        {top.length > 0 ? (
          <ol className="space-y-1 text-sm text-slate-700">
            {top.slice(0, 5).map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span>
                  {item.topPickRank ?? item.rank}. {item.stockName}
                </span>
                <span className="font-bold">{formatScore(item.intradayTotalScore)}점</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-slate-500">강제 제외를 통과한 Top 후보가 없습니다.</p>
        )}
        <p className="text-xs text-slate-500">{snapshot.message}</p>
      </div>
    </Card>
  );
}
