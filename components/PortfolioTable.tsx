"use client";

import { FormEvent, useState } from "react";
import { formatKRW, formatPercent } from "@/lib/formatters";
import { calculatePortfolioValues } from "@/lib/portfolioMath";
import TargetProfitSlider from "./TargetProfitSlider";
import { Button } from "./ui/button";

export type PortfolioRow = {
  id: string;
  stockCode: string;
  stockName: string;
  buyDate: string;
  avgBuyPrice: string | number;
  quantity: string | number;
  investedAmount: string | number;
  targetProfitRate: string | number;
  stopLossRate: string | number;
  targetPrice: string | number;
  stopLossPrice: string | number;
  currentPrice: string | number;
  profitAmount: string | number;
  profitRate: string | number;
  memo: string;
};

type PortfolioForm = {
  id: string;
  stockCode: string;
  stockName: string;
  buyDate: string;
  avgBuyPrice: number;
  quantity: number;
  targetProfitRate: number;
  stopLossRate: number;
  currentPrice: number | "";
  memo: string;
};

const emptyForm: PortfolioForm = {
  id: "",
  stockCode: "",
  stockName: "",
  buyDate: "",
  avgBuyPrice: 0,
  quantity: 0,
  targetProfitRate: 20,
  stopLossRate: 8,
  currentPrice: "",
  memo: "",
};

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toNullableNumber(value: unknown) {
  if (value === "" || value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

type PortfolioTableProps = {
  initialRows: PortfolioRow[];
  initialMessage?: string;
};

export default function PortfolioTable({ initialRows, initialMessage = "" }: PortfolioTableProps) {
  const [rows, setRows] = useState<PortfolioRow[]>(initialRows);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);

  const preview = calculatePortfolioValues({
    avgBuyPrice: toNumber(form.avgBuyPrice),
    quantity: toNumber(form.quantity),
    targetProfitRate: form.targetProfitRate,
    stopLossRate: form.stopLossRate,
    currentPrice: toNullableNumber(form.currentPrice),
  });

  async function loadRows() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/portfolio", { cache: "no-store" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setRows(result.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "보유종목을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const isEdit = Boolean(form.id);
      const response = await fetch("/api/portfolio", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setForm(emptyForm);
      setMessage(isEdit ? "보유종목을 수정했습니다." : "보유종목을 저장했습니다.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 보유종목을 삭제할까요?")) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/portfolio?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setMessage("보유종목을 삭제했습니다.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-3">
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          종목코드
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" value={form.stockCode} onChange={(event) => setForm((prev) => ({ ...prev, stockCode: event.target.value }))} placeholder="005930" required />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          종목명
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" value={form.stockName} onChange={(event) => setForm((prev) => ({ ...prev, stockName: event.target.value }))} placeholder="삼성전자" required />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          매수일
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" type="date" value={form.buyDate} onChange={(event) => setForm((prev) => ({ ...prev, buyDate: event.target.value }))} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          평균매수가
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" type="number" value={form.avgBuyPrice} onChange={(event) => setForm((prev) => ({ ...prev, avgBuyPrice: Number(event.target.value) }))} required />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          보유수량
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" type="number" value={form.quantity} onChange={(event) => setForm((prev) => ({ ...prev, quantity: Number(event.target.value) }))} required />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          현재가
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" type="number" value={form.currentPrice} onChange={(event) => setForm((prev) => ({ ...prev, currentPrice: event.target.value === "" ? "" : Number(event.target.value) }))} placeholder="없으면 비워두기" />
        </label>
        <div className="lg:col-span-2">
          <TargetProfitSlider value={form.targetProfitRate} onChange={(value) => setForm((prev) => ({ ...prev, targetProfitRate: value }))} />
        </div>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          손절률
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" type="number" value={form.stopLossRate} onChange={(event) => setForm((prev) => ({ ...prev, stopLossRate: Number(event.target.value) }))} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700 lg:col-span-3">
          메모
          <input className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal" value={form.memo} onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))} placeholder="매수 사유 또는 점검 사항" />
        </label>
        <div className="grid gap-3 lg:col-span-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-3 text-sm">
            <p className="text-slate-500">투자금액</p>
            <p className="font-black">{formatKRW(preview.investedAmount)}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-sm">
            <p className="text-slate-500">목표가</p>
            <p className="font-black">{formatKRW(preview.targetPrice)}</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-sm">
            <p className="text-slate-500">손절가</p>
            <p className="font-black">{formatKRW(preview.stopLossPrice)}</p>
          </div>
        </div>
        <div className="flex gap-2 lg:col-span-3">
          <Button disabled={loading} type="submit">{form.id ? "수정 저장" : "보유종목 저장"}</Button>
          {form.id ? <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>취소</Button> : null}
        </div>
      </form>

      {message ? <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">종목</th>
              <th className="px-4 py-3">평균/수량</th>
              <th className="px-4 py-3">투자금액</th>
              <th className="px-4 py-3">현재가</th>
              <th className="px-4 py-3">평가손익</th>
              <th className="px-4 py-3">목표/손절</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={7}>{loading ? "불러오는 중..." : "저장된 보유종목이 없습니다."}</td></tr>
            ) : rows.map((row) => {
              const currentPrice = toNullableNumber(row.currentPrice);
              const profitAmount = toNullableNumber(row.profitAmount);
              const profitRate = toNullableNumber(row.profitRate);
              return (
                <tr key={row.id}>
                  <td className="px-4 py-3"><div className="font-bold text-slate-950">{row.stockName}</div><div className="text-xs text-slate-500">{row.stockCode}</div></td>
                  <td className="px-4 py-3">{formatKRW(toNumber(row.avgBuyPrice))} / {row.quantity}주</td>
                  <td className="px-4 py-3">{formatKRW(toNumber(row.investedAmount))}</td>
                  <td className="px-4 py-3">{currentPrice == null ? "현재가 없음" : formatKRW(currentPrice)}</td>
                  <td className="px-4 py-3">{profitAmount == null || profitRate == null ? "현재가 없음" : `${formatKRW(profitAmount)} (${formatPercent(profitRate)})`}</td>
                  <td className="px-4 py-3">{formatKRW(toNumber(row.targetPrice))} / {formatKRW(toNumber(row.stopLossPrice))}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setForm({
                        id: row.id,
                        stockCode: row.stockCode,
                        stockName: row.stockName,
                        buyDate: row.buyDate,
                        avgBuyPrice: toNumber(row.avgBuyPrice),
                        quantity: toNumber(row.quantity),
                        targetProfitRate: toNumber(row.targetProfitRate),
                        stopLossRate: toNumber(row.stopLossRate),
                        currentPrice: currentPrice ?? "",
                        memo: row.memo,
                      })}>수정</Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleDelete(row.id)}>삭제</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
