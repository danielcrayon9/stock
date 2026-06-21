import { formatScore } from "@/lib/formatters";
import type { TodayNewsCheck } from "@/lib/intradayTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  stockCode?: string;
  stockName?: string;
  score?: number | null;
  checks?: TodayNewsCheck[];
  highlights?: { title: string; publishedAt: string; isIntraday: boolean }[];
  intradayNewsCount?: number;
  dataSource?: string;
};

function checkTone(check: TodayNewsCheck): string {
  if (check.passed == null) return "text-slate-500 bg-slate-50";
  if (check.scoreDelta < 0 && check.passed) return "text-rose-700 bg-rose-50";
  if (check.scoreDelta > 0 && check.passed) return "text-emerald-700 bg-emerald-50";
  return "text-slate-600 bg-slate-50";
}

export default function TodayNewsCard({
  stockCode,
  stockName,
  score = null,
  checks = [],
  highlights = [],
  intradayNewsCount = 0,
  dataSource,
}: Props) {
  const defaultChecks: TodayNewsCheck[] = [
    { id: "order", label: "장중 신규 수주", passed: null, scoreDelta: 20, detail: "분석 대기" },
    { id: "supply", label: "공급계약/실적 개선", passed: null, scoreDelta: 15, detail: "분석 대기" },
    { id: "policy", label: "정부 정책 수혜", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "dart", label: "공시로 확인 가능", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "rehash", label: "전일 뉴스 재탕", passed: null, scoreDelta: 2, detail: "분석 대기" },
    { id: "theme", label: "단순 테마성", passed: null, scoreDelta: 3, detail: "분석 대기" },
    { id: "negative", label: "악재 뉴스", passed: null, scoreDelta: -20, detail: "분석 대기" },
    { id: "risk", label: "유상증자/CB/소송/규제", passed: null, scoreDelta: -25, detail: "분석 대기" },
  ];

  const items = checks.length > 0 ? checks : defaultChecks;

  return (
    <Card>
      <CardHeader>
        <CardTitle>당일 뉴스 분석 (6단계)</CardTitle>
        <CardDescription>
          발행 시간 기준 장중/전일 재탕 구분, 공시 교차 확인, 호재·악재 키워드 점수화.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {stockCode ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">
              {stockName ?? stockCode} · 뉴스 {score == null ? "대기" : formatScore(score)}점
            </p>
            <p className="mt-1 text-xs text-slate-500">장중 뉴스 {intradayNewsCount}건</p>
            {dataSource ? <p className="mt-1 text-xs text-amber-700">{dataSource}</p> : null}
          </div>
        ) : null}
        {highlights.length > 0 ? (
          <ul className="space-y-1 text-xs text-slate-600">
            {highlights.slice(0, 3).map((item) => (
              <li key={`${item.title}-${item.publishedAt}`} className="rounded-lg bg-slate-50 px-2 py-1">
                {item.isIntraday ? "[장중] " : ""}
                {item.title}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          {items.map((check) => (
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
      </div>
    </Card>
  );
}
