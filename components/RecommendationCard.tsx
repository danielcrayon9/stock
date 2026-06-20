"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatEok, formatKRW, formatPercent, formatRatio, formatScore } from "@/lib/formatters";
import type { ScanResultRow } from "@/lib/types";

type RecommendationCardProps = {
  result: ScanResultRow;
};

const RISK_BADGE: Record<string, string> = {
  "낮음": "bg-emerald-100 text-emerald-700",
  "보통": "bg-sky-100 text-sky-700",
  "주의": "bg-amber-100 text-amber-700",
  "높음": "bg-orange-100 text-orange-700",
  "매우 높음": "bg-red-100 text-red-700",
};

function ScoreItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-lg border border-slate-100 p-2 text-center">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm font-bold text-slate-900">{value == null ? "데이터 부족" : `${Math.round(value)}`}</p>
    </div>
  );
}

function PriceItem({ label, value, tone }: { label: string; value: number | null; tone?: "buy" | "stop" | "target" }) {
  const toneClass =
    tone === "stop" ? "text-red-600" : tone === "target" ? "text-emerald-600" : "text-slate-900";
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${toneClass}`}>{formatKRW(value)}</span>
    </div>
  );
}

export default function RecommendationCard({ result }: RecommendationCardProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const isExcluded = result.recommendationType === "제외 후보";
  const isChaseRisk =
    result.currentPrice != null &&
    result.neutralBuyPrice != null &&
    result.currentPrice > result.neutralBuyPrice * 1.03;

  async function post(endpoint: string, label: string) {
    setPending(endpoint);
    setStatus(null);
    try {
      const response = await fetch(`/api/recommendations/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode: result.stockCode,
          stockName: result.stockName,
          market: result.market,
          currentPrice: result.currentPrice,
          targetPrice1: result.targetPrice1,
          stopLossPrice: result.stopLossPrice,
        }),
      });
      const payload = await response.json();
      setStatus(payload.ok ? `${label} 완료` : `${label} 실패: ${payload.error ?? "오류"}`);
    } catch {
      setStatus(`${label} 실패: 네트워크 오류`);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4 rounded-xl bg-slate-50 p-4">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <ScoreItem label="기술" value={result.technicalScore} />
        <ScoreItem label="거래대금" value={result.volumeScore} />
        <ScoreItem label="재무" value={result.financialScore} />
        <ScoreItem label="공시" value={result.disclosureScore} />
        <ScoreItem label="뉴스" value={result.newsScore} />
        <ScoreItem label="리스크" value={result.riskScore} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="mb-2 text-sm font-bold text-slate-950">매수가 / 목표가</p>
          <PriceItem label="보수적 매수가" value={result.conservativeBuyPrice} tone="buy" />
          <PriceItem label="중립적 매수가" value={result.neutralBuyPrice} tone="buy" />
          <PriceItem label="공격적 매수가" value={result.aggressiveBuyPrice} tone="buy" />
          <PriceItem label="손절가" value={result.stopLossPrice} tone="stop" />
          <PriceItem label="1차 목표가" value={result.targetPrice1} tone="target" />
          <PriceItem label="2차 목표가" value={result.targetPrice2} tone="target" />
        </div>

        <div className="space-y-2 rounded-xl border border-slate-100 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">종합 점수</span>
            <span className="text-sm font-bold text-slate-900">{formatScore(result.totalScore)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">손익비</span>
            <span className="text-sm font-bold text-slate-900">{formatRatio(result.riskRewardRatio)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">최종 의견</span>
            <span className="text-sm font-bold text-slate-900">{result.finalOpinion || "데이터 부족"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">리스크 등급</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${RISK_BADGE[result.riskLevel] ?? "bg-slate-100 text-slate-600"}`}>
              {result.riskLevel || "데이터 부족"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">등락률</span>
            <span className="text-sm font-semibold text-slate-900">{formatPercent(result.changeRate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">거래대금</span>
            <span className="text-sm font-semibold text-slate-900">{formatEok(result.tradingValue)}</span>
          </div>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600">{result.summary || "요약 데이터 부족"}</p>

      {isChaseRisk && !isExcluded ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          현재가가 중립 매수가보다 높습니다. 추격매수에 주의하고 눌림목을 기다리는 것을 고려하세요.
        </p>
      ) : null}

      {isExcluded ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          제외 사유: {result.summary || "리스크/조건 미달"}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={pending != null}
            onClick={() => post("add-to-watchlist", "관심종목 추가")}
          >
            관심종목 추가
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending != null}
            onClick={() => post("add-to-portfolio-candidate", "보유 후보 등록")}
          >
            보유 후보 등록
          </Button>
        </div>
      )}

      {status ? <p className="text-xs font-semibold text-slate-600">{status}</p> : null}
    </div>
  );
}
