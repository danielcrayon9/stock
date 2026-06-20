import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEok, formatKRW } from "@/lib/formatters";
import type { DisclosureResult, FinancialMetric, FinancialResult, NewsResult, Sentiment } from "@/lib/types";

type FundamentalInsightsProps = {
  disclosures: DisclosureResult | null;
  financials: FinancialResult | null;
  news: NewsResult | null;
  loading?: boolean;
};

function sentimentLabel(sentiment: Sentiment) {
  if (sentiment === "positive") return { label: "호재", className: "bg-red-100 text-red-700" };
  if (sentiment === "negative") return { label: "악재", className: "bg-blue-100 text-blue-700" };
  return { label: "중립", className: "bg-slate-100 text-slate-600" };
}

function formatMetric(metric: FinancialMetric) {
  if (metric.value == null) return metric.source && metric.source !== "OpenDART 사업보고서" ? metric.source : "데이터 부족";
  if (metric.unit === "억원") return formatEok(metric.value);
  if (metric.unit === "원") return formatKRW(metric.value);
  if (metric.unit === "%") return `${metric.value.toFixed(2)}%`;
  return `${metric.value.toFixed(2)}${metric.unit}`;
}

function metricValueClassName(metric: FinancialMetric) {
  if (metric.value != null) return "text-slate-800";
  if (metric.source && metric.source !== "OpenDART 사업보고서") return "max-w-[180px] text-xs leading-5 text-amber-700";
  return "text-slate-800";
}

function ScoreBadge({ label, score }: { label: string; score: number | null | undefined }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{score == null ? "데이터 부족" : `${score}점`}</p>
    </div>
  );
}

export default function FundamentalInsights({ disclosures, financials, news, loading = false }: FundamentalInsightsProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>공시·뉴스·실적</CardTitle>
          <CardDescription>OpenDART와 Naver 뉴스 데이터를 불러오는 중입니다.</CardDescription>
        </CardHeader>
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          데이터를 수집하고 호재/악재/중립으로 분류하는 중입니다.
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>공시 분석</CardTitle>
          <CardDescription>{disclosures?.message ?? "종목을 선택하면 공시를 조회합니다."}</CardDescription>
        </CardHeader>
        <ScoreBadge label="공시 점수" score={disclosures?.disclosureScore} />
        <div className="mt-4 space-y-3">
          {(disclosures?.items ?? []).slice(0, 5).map((item) => {
            const sentiment = sentimentLabel(item.sentiment);
            return (
              <a
                key={item.receiptNo}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-slate-100 p-3 text-sm hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.reportName}</p>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${sentiment.className}`}>
                    {sentiment.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.receivedAt}</p>
              </a>
            );
          })}
          {disclosures && disclosures.items.length === 0 ? <p className="text-sm text-slate-500">공시 데이터 부족</p> : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>뉴스 분석</CardTitle>
          <CardDescription>{news?.message ?? "종목을 선택하면 뉴스를 조회합니다."}</CardDescription>
        </CardHeader>
        <ScoreBadge label="뉴스 점수" score={news?.newsScore} />
        <div className="mt-4 space-y-3">
          {(news?.items ?? []).slice(0, 5).map((item) => {
            const sentiment = sentimentLabel(item.sentiment);
            return (
              <a
                key={`${item.title}-${item.url}`}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-slate-100 p-3 text-sm hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${sentiment.className}`}>
                    {sentiment.label}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.summary}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {item.source} · {item.category}
                </p>
              </a>
            );
          })}
          {news && news.items.length === 0 ? <p className="text-sm text-slate-500">뉴스 데이터 부족</p> : null}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>실적 분석</CardTitle>
          <CardDescription>{financials?.message ?? "종목을 선택하면 가능한 실적 데이터를 조회합니다."}</CardDescription>
        </CardHeader>
        <ScoreBadge label="실적 점수" score={financials?.financialScore} />
        <div className="mt-4 rounded-xl border border-slate-100 px-4">
          {(financials?.metrics ?? []).map((metric) => (
            <div key={metric.label} className="flex items-center justify-between border-b border-slate-100 py-2 last:border-b-0">
              <span className="text-sm text-slate-500">{metric.label}</span>
              <span className={`text-right text-sm font-semibold ${metricValueClassName(metric)}`}>
                {formatMetric(metric)}
              </span>
            </div>
          ))}
          {!financials ? <p className="py-3 text-sm text-slate-500">실적 데이터 대기 중</p> : null}
        </div>
        {financials ? <p className="mt-3 text-sm text-slate-500">{financials.summary}</p> : null}
      </Card>
    </div>
  );
}
