"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatEok, formatKRW, formatPercent, formatRatio, formatScore, formatSignedPercent } from "@/lib/formatters";
import { netReturnRate } from "@/lib/tradingCost";
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

type PriceRole = "entry" | "stop" | "target";

type SelectedPrice = {
  label: string;
  value: number | null;
};

function PriceItem({
  label,
  value,
  tone,
  onSelect,
}: {
  label: string;
  value: number | null;
  tone?: "buy" | "stop" | "target";
  onSelect: () => void;
}) {
  const toneClass =
    tone === "stop" ? "text-red-600" : tone === "target" ? "text-emerald-600" : "text-slate-900";
  return (
    <button
      type="button"
      disabled={value == null}
      onClick={onSelect}
      className="flex w-full items-center justify-between border-b border-slate-100 py-1.5 text-left transition-colors last:border-b-0 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      title={value == null ? "계산할 가격 데이터가 없습니다." : `${label}를 계산기에 입력`}
    >
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${toneClass}`}>{formatKRW(value)}</span>
    </button>
  );
}

function profitRate(entryPrice: number | null, targetPrice: number | null) {
  if (entryPrice == null || targetPrice == null || entryPrice <= 0) return null;
  return ((targetPrice - entryPrice) / entryPrice) * 100;
}

function netProfitRate(entryPrice: number | null, exitPrice: number | null) {
  if (entryPrice == null || exitPrice == null) return null;
  return netReturnRate(entryPrice, exitPrice);
}

function ChangeRate({ value }: { value: number | null }) {
  if (value == null) return <span>데이터 부족</span>;
  const marker = value > 0 ? "▲" : value < 0 ? "▼" : "";
  return (
    <span className="inline-flex items-center gap-1">
      {marker ? <span className="text-[0.55em] leading-none" style={{ fontSize: "0.55em" }}>{marker}</span> : null}
      {formatPercent(value)}
    </span>
  );
}

export default function RecommendationCard({ result }: RecommendationCardProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [entryPrice, setEntryPrice] = useState<SelectedPrice>({
    label: "기준 매수가",
    value: result.neutralBuyPrice ?? result.currentPrice,
  });
  const [targetPrice, setTargetPrice] = useState<SelectedPrice>({
    label: "1차 목표가",
    value: result.targetPrice1,
  });
  const [stopPrice, setStopPrice] = useState<SelectedPrice>({
    label: "손절가",
    value: result.stopLossPrice,
  });

  const isExcluded = result.recommendationType === "제외 후보";
  const isChaseRisk =
    result.currentPrice != null &&
    result.neutralBuyPrice != null &&
    result.currentPrice > result.neutralBuyPrice * 1.03;
  const expectedProfitRate = profitRate(entryPrice.value, targetPrice.value);
  const expectedStopRate = profitRate(entryPrice.value, stopPrice.value);
  const expectedNetProfitRate = netProfitRate(entryPrice.value, targetPrice.value);
  const expectedNetStopRate = netProfitRate(entryPrice.value, stopPrice.value);

  function selectPrice(role: PriceRole, label: string, value: number | null) {
    if (value == null) return;
    const selected = { label, value };
    if (role === "entry") setEntryPrice(selected);
    if (role === "target") setTargetPrice(selected);
    if (role === "stop") setStopPrice(selected);
  }

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
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? `HTTP ${response.status}`);
      }
      setStatus(`${label} 완료`);
    } catch (error) {
      setStatus(`${label} 실패: ${error instanceof Error ? error.message : "네트워크 오류"}`);
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
          <PriceItem
            label="눌림 매수가"
            value={result.conservativeBuyPrice}
            tone="buy"
            onSelect={() => selectPrice("entry", "눌림 매수가", result.conservativeBuyPrice)}
          />
          <PriceItem
            label="기준 매수가"
            value={result.neutralBuyPrice}
            tone="buy"
            onSelect={() => selectPrice("entry", "기준 매수가", result.neutralBuyPrice)}
          />
          <PriceItem
            label="현재가/돌파 접근가"
            value={result.aggressiveBuyPrice}
            tone="buy"
            onSelect={() => selectPrice("entry", "현재가/돌파 접근가", result.aggressiveBuyPrice)}
          />
          <PriceItem
            label="손절가"
            value={result.stopLossPrice}
            tone="stop"
            onSelect={() => selectPrice("stop", "손절가", result.stopLossPrice)}
          />
          <PriceItem
            label="1차 목표가"
            value={result.targetPrice1}
            tone="target"
            onSelect={() => selectPrice("target", "1차 목표가", result.targetPrice1)}
          />
          <PriceItem
            label="2차 목표가"
            value={result.targetPrice2}
            tone="target"
            onSelect={() => selectPrice("target", "2차 목표가", result.targetPrice2)}
          />
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
            <span className="text-sm text-slate-500">비용 차감 순손익비</span>
            <span className="text-sm font-bold text-slate-900">{formatRatio(result.netRiskRewardRatio)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">기준 매수가 순수익</span>
            <span className="text-sm font-bold text-slate-900">{formatSignedPercent(result.netProfitRate)}</span>
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
            <span className="text-sm font-semibold text-slate-900">
              <ChangeRate value={result.changeRate} />
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">거래대금</span>
            <span className="text-sm font-semibold text-slate-900">{formatEok(result.tradingValue)}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs text-slate-500">백테스트 체결</p>
          <p className="mt-1 text-lg font-black text-slate-950">
            {result.backtestTrades == null ? "데이터 부족" : `${result.backtestTrades}회`}
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs text-slate-500">백테스트 승률</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatPercent(result.backtestWinRate)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs text-slate-500">평균 순수익률</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatSignedPercent(result.backtestAverageNetReturn)}</p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white p-3">
          <p className="text-xs text-slate-500">최대낙폭</p>
          <p className="mt-1 text-lg font-black text-slate-950">{formatSignedPercent(result.backtestMaxDrawdown)}</p>
        </div>
      </div>
      <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-600">
        {result.backtestSummary || "백테스트 데이터 부족"} · 비용 가정: {result.costDescription || "기본 국내주식 비용 모델"}
      </p>

      <div className="rounded-xl border border-slate-100 bg-white p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-slate-950">수익률 계산기</p>
          <p className="text-xs text-slate-500">매수가·목표가·손절가를 클릭하면 자동 계산됩니다.</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-500">선택 매수가</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{entryPrice.label}</p>
            <p className="text-lg font-black text-slate-950">{formatKRW(entryPrice.value)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 p-3">
            <p className="text-xs text-emerald-700">선택 목표가</p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">{targetPrice.label}</p>
            <p className="text-lg font-black text-emerald-700">{formatKRW(targetPrice.value)}</p>
            <p className="text-xs font-bold text-emerald-700">총수익률 {formatSignedPercent(expectedProfitRate)}</p>
            <p className="text-xs font-bold text-emerald-700">순수익률 {formatSignedPercent(expectedNetProfitRate)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-xs text-red-700">선택 손절가</p>
            <p className="mt-1 text-sm font-semibold text-red-900">{stopPrice.label}</p>
            <p className="text-lg font-black text-red-600">{formatKRW(stopPrice.value)}</p>
            <p className="text-xs font-bold text-red-700">손절 총손익률 {formatSignedPercent(expectedStopRate)}</p>
            <p className="text-xs font-bold text-red-700">손절 순손익률 {formatSignedPercent(expectedNetStopRate)}</p>
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
