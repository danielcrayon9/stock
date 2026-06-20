"use client";

import { Fragment, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import RecommendationCard from "@/components/RecommendationCard";
import { RECOMMENDATION_TYPES } from "@/lib/constants";
import { formatPercent, formatRatio, formatScore } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RecommendationType, ScanResultRow } from "@/lib/types";

type RecommendationTableProps = {
  results: ScanResultRow[];
};

type Tab = "전체" | RecommendationType;
type SortKey = "currentPrice" | "changeRate" | "totalScore" | "riskRewardRatio";
type SortDirection = "asc" | "desc";

const TABS: Tab[] = ["전체", ...RECOMMENDATION_TYPES];
const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "currentPrice", label: "현재가" },
  { key: "changeRate", label: "등락률" },
  { key: "totalScore", label: "종합" },
  { key: "riskRewardRatio", label: "손익비" },
];

const TYPE_BADGE: Record<RecommendationType, string> = {
  "즉시 관심 후보": "bg-emerald-100 text-emerald-700",
  "분할매수 후보": "bg-sky-100 text-sky-700",
  "눌림목 대기 후보": "bg-amber-100 text-amber-700",
  "돌파 관심 후보": "bg-violet-100 text-violet-700",
  "제외 후보": "bg-slate-200 text-slate-600",
};

const TYPE_TOP_PICK_BONUS: Record<RecommendationType, number> = {
  "즉시 관심 후보": 26,
  "분할매수 후보": 18,
  "돌파 관심 후보": 10,
  "눌림목 대기 후보": 3,
  "제외 후보": -100,
};

const RISK_PENALTY: Record<string, number> = {
  낮음: 0,
  보통: 3,
  주의: 8,
  높음: 18,
  "매우 높음": 30,
};

function ChangeRate({ value, className }: { value: number | null; className?: string }) {
  const marker = value == null ? "" : value > 0 ? "▲" : value < 0 ? "▼" : "";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold",
        (value ?? 0) > 0 ? "text-red-600" : (value ?? 0) < 0 ? "text-blue-600" : "text-slate-500",
        className,
      )}
    >
      {marker ? <span className="text-[0.35em] leading-none">{marker}</span> : null}
      {formatPercent(value)}
    </span>
  );
}

function MobileMetric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="mt-1 text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}

function sortValue(row: ScanResultRow, key: SortKey) {
  return row[key];
}

function formatPriceNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 부족";
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value);
}

function buyZoneScore(row: ScanResultRow) {
  const current = row.currentPrice;
  const neutral = row.neutralBuyPrice;
  const conservative = row.conservativeBuyPrice;
  if (current == null || neutral == null || neutral <= 0) return 0;

  const neutralDistance = Math.abs(current - neutral) / neutral;
  if (current <= neutral * 1.01 && (conservative == null || current >= conservative * 0.95)) return 22;
  if (current <= neutral * 1.03) return 14;
  if (current < neutral) return Math.max(8, 14 - neutralDistance * 100);
  return -Math.min(25, neutralDistance * 120);
}

function topPickScore(row: ScanResultRow) {
  if (row.recommendationType === "제외 후보" || row.finalOpinion === "제외" || row.finalOpinion === "매수금지") {
    return -Infinity;
  }
  const totalScore = row.totalScore ?? 0;
  const riskRewardScore = Math.min((row.riskRewardRatio ?? 0) * 4, 28);
  const riskPenalty = RISK_PENALTY[row.riskLevel] ?? 8;
  return totalScore + riskRewardScore + buyZoneScore(row) + TYPE_TOP_PICK_BONUS[row.recommendationType] - riskPenalty;
}

export default function RecommendationTable({ results }: RecommendationTableProps) {
  const [tab, setTab] = useState<Tab>("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "totalScore",
    direction: "desc",
  });

  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    [...results]
      .sort((left, right) => (right.totalScore ?? 0) - (left.totalScore ?? 0))
      .forEach((row, index) => map.set(row.id, index + 1));
    return map;
  }, [results]);

  const counts = useMemo(() => {
    const map = new Map<Tab, number>();
    map.set("전체", results.length);
    for (const type of RECOMMENDATION_TYPES) {
      map.set(type, results.filter((row) => row.recommendationType === type).length);
    }
    return map;
  }, [results]);

  const filtered = useMemo(() => {
    const list = tab === "전체" ? results : results.filter((row) => row.recommendationType === tab);
    return [...list].sort((left, right) => {
      const leftValue = sortValue(left, sort.key);
      const rightValue = sortValue(right, sort.key);
      if (leftValue == null && rightValue == null) return (right.totalScore ?? 0) - (left.totalScore ?? 0);
      if (leftValue == null) return 1;
      if (rightValue == null) return -1;
      const diff = leftValue - rightValue;
      if (diff === 0) return (right.totalScore ?? 0) - (left.totalScore ?? 0);
      return sort.direction === "asc" ? diff : -diff;
    });
  }, [results, tab, sort]);

  const topPicks = useMemo(
    () =>
      [...results]
        .map((row) => ({ row, score: topPickScore(row) }))
        .filter((item) => Number.isFinite(item.score))
        .sort((left, right) => right.score - left.score)
        .slice(0, 3)
        .map((item) => item.row),
    [results],
  );

  function toggleSort(key: SortKey) {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc",
    }));
  }

  function sortLabel(key: SortKey) {
    if (sort.key !== key) return "";
    return sort.direction === "desc" ? " ↓" : " ↑";
  }

  if (results.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        표시할 스캔 결과가 없습니다. 시장 스캐너에서 스캔을 실행하세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {topPicks.length > 0 ? (
        <section className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Top Picks</p>
              <h3 className="text-lg font-black text-slate-950">현재 매수 접근성 Top 3</h3>
            </div>
            <p className="text-xs text-slate-500">종합점수, 손익비, 기준 매수가 근접도, 리스크를 함께 반영했습니다.</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {topPicks.map((row, index) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setExpandedId((current) => (current === row.id ? null : row.id))}
                className="rounded-2xl border border-emerald-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-emerald-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-black text-white">
                      TOP {index + 1}
                    </span>
                    <p className="mt-2 truncate text-base font-black text-slate-950">{row.stockName}</p>
                    <p className="text-xs text-slate-400">
                      {row.stockCode} · {row.market}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${TYPE_BADGE[row.recommendationType]}`}>
                    {row.recommendationType}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <MobileMetric label="현재가" value={<span className="text-base font-black">{formatPriceNumber(row.currentPrice)}</span>} />
                  <MobileMetric label="종합" value={formatScore(row.totalScore)} />
                  <MobileMetric label="손익비" value={formatRatio(row.riskRewardRatio)} />
                  <MobileMetric label="의견" value={row.finalOpinion || "-"} />
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
              tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {item} {counts.get(item) ?? 0}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 md:hidden">
        <span className="text-xs font-semibold text-slate-500">정렬</span>
        {SORT_OPTIONS.map((option) => (
          <button
            key={option.key}
            type="button"
            onClick={() => toggleSort(option.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
              sort.key === option.key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {option.label}
            {sortLabel(option.key)}
          </button>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((row) => {
          const expanded = expandedId === row.id;
          return (
            <article key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : row.id)}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-950 px-2 py-0.5 text-xs font-bold text-white">
                      #{rankMap.get(row.id)}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{row.market}</span>
                  </div>
                  <p className="mt-2 truncate text-base font-black text-slate-950">{row.stockName}</p>
                  <p className="text-xs text-slate-400">{row.stockCode}</p>
                </div>
                <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} />
              </button>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MobileMetric label="현재가" value={<span className="text-base font-black">{formatPriceNumber(row.currentPrice)}</span>} />
                <MobileMetric label="등락률" value={<ChangeRate value={row.changeRate} />} />
                <MobileMetric label="종합" value={formatScore(row.totalScore)} />
                <MobileMetric label="손익비" value={formatRatio(row.riskRewardRatio)} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${TYPE_BADGE[row.recommendationType]}`}>
                  {row.recommendationType}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  의견 {row.finalOpinion || "-"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                  리스크 {row.riskLevel || "-"}
                </span>
              </div>

              {expanded ? (
                <div className="mt-4">
                  <RecommendationCard result={row} />
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="hidden rounded-2xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="px-3 py-3">순위</th>
              <th className="px-3 py-3">종목</th>
              <th className="px-3 py-3">시장</th>
              <th className="px-3 py-3 text-right">
                <button type="button" onClick={() => toggleSort("currentPrice")} className="font-bold hover:text-slate-700">
                  현재가{sortLabel("currentPrice")}
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button type="button" onClick={() => toggleSort("changeRate")} className="font-bold hover:text-slate-700">
                  등락률{sortLabel("changeRate")}
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button type="button" onClick={() => toggleSort("totalScore")} className="font-bold hover:text-slate-700">
                  종합{sortLabel("totalScore")}
                </button>
              </th>
              <th className="px-3 py-3 text-right">
                <button type="button" onClick={() => toggleSort("riskRewardRatio")} className="font-bold hover:text-slate-700">
                  손익비{sortLabel("riskRewardRatio")}
                </button>
              </th>
              <th className="px-3 py-3">추천 유형</th>
              <th className="px-3 py-3">의견</th>
              <th className="px-3 py-3">리스크</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const expanded = expandedId === row.id;
              return (
                <Fragment key={row.id}>
                  <tr
                    className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                  >
                    <td className="px-3 py-3 font-bold text-slate-900">{rankMap.get(row.id)}</td>
                    <td className="px-3 py-3">
                      <p className="font-semibold text-slate-900">{row.stockName}</p>
                      <p className="text-xs text-slate-400">{row.stockCode}</p>
                    </td>
                    <td className="px-3 py-3 text-slate-500">{row.market}</td>
                    <td className="px-3 py-3 text-right text-base font-black text-slate-950">{formatPriceNumber(row.currentPrice)}</td>
                    <td className="px-3 py-3 text-right">
                      <ChangeRate value={row.changeRate} />
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-slate-900">{formatScore(row.totalScore)}</td>
                    <td className="px-3 py-3 text-right text-slate-700">{formatRatio(row.riskRewardRatio)}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${TYPE_BADGE[row.recommendationType]}`}>
                        {row.recommendationType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{row.finalOpinion || "-"}</td>
                    <td className="px-3 py-3 text-slate-700">{row.riskLevel || "-"}</td>
                    <td className="px-3 py-3 text-right">
                      <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", expanded && "rotate-180")} />
                    </td>
                  </tr>
                  {expanded ? (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={11} className="px-3 py-4">
                        <RecommendationCard result={row} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
