"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import RecommendationCard from "@/components/RecommendationCard";
import { RECOMMENDATION_TYPES } from "@/lib/constants";
import { formatKRW, formatPercent, formatRatio, formatScore } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { RecommendationType, ScanResultRow } from "@/lib/types";

type RecommendationTableProps = {
  results: ScanResultRow[];
};

type Tab = "전체" | RecommendationType;

const TABS: Tab[] = ["전체", ...RECOMMENDATION_TYPES];

const TYPE_BADGE: Record<RecommendationType, string> = {
  "즉시 관심 후보": "bg-emerald-100 text-emerald-700",
  "분할매수 후보": "bg-sky-100 text-sky-700",
  "눌림목 대기 후보": "bg-amber-100 text-amber-700",
  "돌파 관심 후보": "bg-violet-100 text-violet-700",
  "제외 후보": "bg-slate-200 text-slate-600",
};

export default function RecommendationTable({ results }: RecommendationTableProps) {
  const [tab, setTab] = useState<Tab>("전체");
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    return [...list].sort((left, right) => (right.totalScore ?? 0) - (left.totalScore ?? 0));
  }, [results, tab]);

  if (results.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        표시할 스캔 결과가 없습니다. 시장 스캐너에서 스캔을 실행하세요.
      </p>
    );
  }

  return (
    <div className="space-y-4">
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

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="px-3 py-3">순위</th>
              <th className="px-3 py-3">종목</th>
              <th className="px-3 py-3">시장</th>
              <th className="px-3 py-3 text-right">현재가</th>
              <th className="px-3 py-3 text-right">등락률</th>
              <th className="px-3 py-3 text-right">종합</th>
              <th className="px-3 py-3 text-right">손익비</th>
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
                    <td className="px-3 py-3 text-right text-slate-900">{formatKRW(row.currentPrice)}</td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right font-semibold",
                        (row.changeRate ?? 0) > 0 ? "text-red-600" : (row.changeRate ?? 0) < 0 ? "text-blue-600" : "text-slate-500",
                      )}
                    >
                      {formatPercent(row.changeRate)}
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
