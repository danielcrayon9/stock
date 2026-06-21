"use client";

import { Fragment } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatEok, formatKRW, formatPercent, formatRatio, formatScore } from "@/lib/formatters";
import type { IntradayCandidate } from "@/lib/intradayTypes";

type Props = {
  candidates: IntradayCandidate[];
};

function scoreText(value: number | null) {
  return value == null ? "대기" : formatScore(value);
}

function ScorePill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{scoreText(value)}</p>
    </div>
  );
}

export default function IntradayRecommendationTable({ candidates }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(candidates[0]?.id ?? null);

  if (candidates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        장중 추천 후보가 없습니다. realtime-worker 연결 후 후보가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full min-w-[1180px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-3">순위</th>
            <th className="px-3 py-3">종목</th>
            <th className="px-3 py-3 text-right">현재가</th>
            <th className="px-3 py-3 text-right">등락률</th>
            <th className="px-3 py-3 text-right">거래대금</th>
            <th className="px-3 py-3 text-right">분봉</th>
            <th className="px-3 py-3 text-right">거래대금 지속</th>
            <th className="px-3 py-3 text-right">호가</th>
            <th className="px-3 py-3 text-right">뉴스</th>
            <th className="px-3 py-3 text-right">시장</th>
            <th className="px-3 py-3 text-right">종합</th>
            <th className="px-3 py-3">추천 유형</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {candidates.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <Fragment key={item.id}>
                <tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setExpandedId(expanded ? null : item.id)}>
                  <td className="px-3 py-3 font-black text-slate-950">{item.rank}</td>
                  <td className="px-3 py-3">
                    <p className="font-bold text-slate-950">{item.stockName}</p>
                    <p className="text-xs text-slate-500">{item.stockCode} · {item.market}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-black text-slate-950">{formatKRW(item.currentPrice)}</td>
                  <td className="px-3 py-3 text-right font-semibold">{formatPercent(item.changeRate)}</td>
                  <td className="px-3 py-3 text-right">{formatEok(item.tradingValue)}</td>
                  <td className="px-3 py-3 text-right">{scoreText(item.minuteFlowScore)}</td>
                  <td className="px-3 py-3 text-right">{scoreText(item.volumePersistenceScore)}</td>
                  <td className="px-3 py-3 text-right">{scoreText(item.orderbookScore)}</td>
                  <td className="px-3 py-3 text-right">{scoreText(item.todayNewsScore)}</td>
                  <td className="px-3 py-3 text-right">{scoreText(item.marketIndexScore)}</td>
                  <td className="px-3 py-3 text-right font-black text-slate-950">{scoreText(item.intradayTotalScore)}</td>
                  <td className="px-3 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">
                      {item.recommendationType}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </td>
                </tr>
                {expanded ? (
                  <tr key={`${item.id}-detail`} className="bg-slate-50">
                    <td colSpan={13} className="px-4 py-4">
                      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                            <ScorePill label="분봉" value={item.minuteFlowScore} />
                            <ScorePill label="거래대금" value={item.volumePersistenceScore} />
                            <ScorePill label="호가" value={item.orderbookScore} />
                            <ScorePill label="뉴스" value={item.todayNewsScore} />
                            <ScorePill label="시장" value={item.marketIndexScore} />
                          </div>
                          <div className="rounded-xl bg-white p-4 text-sm leading-6 text-slate-600">
                            <p className="font-bold text-slate-950">핵심 사유</p>
                            <p>{item.summary}</p>
                            <p className="mt-2">분봉: {item.minuteFlowSummary}</p>
                            <p>거래대금: {item.volumePersistenceSummary}</p>
                            <p>호가: {item.orderbookSummary}</p>
                            <p>시장: {item.marketIndexSummary}</p>
                            <p>뉴스: {item.todayNewsSummary}</p>
                          </div>
                        </div>
                        <div className="space-y-2 rounded-xl bg-white p-4 text-sm">
                          <p className="font-black text-slate-950">진입 조건 요약</p>
                          <p>타이밍: {item.entryTiming}</p>
                          <p>진입 관심 가격대: {item.entryPriceRange}</p>
                          <p>손절가: {formatKRW(item.stopLossPrice)}</p>
                          <p>1차 목표가: {formatKRW(item.targetPrice1)}</p>
                          <p>2차 목표가: {formatKRW(item.targetPrice2)}</p>
                          <p>손익비: {formatRatio(item.riskRewardRatio)}</p>
                          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                            실제 주문은 실행되지 않습니다. 자동매매 기능도 없습니다.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
