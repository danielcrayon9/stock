"use client";

import { FormEvent, useState } from "react";
import TargetProfitSlider from "./TargetProfitSlider";
import { Button } from "./ui/button";

export type WatchlistRow = {
  id: string;
  stockCode: string;
  stockName: string;
  market: string;
  targetProfitRate: string | number;
  memo: string;
  lastAnalyzedAt: string;
  createdAt: string;
  updatedAt: string;
  isActive: string | boolean;
};

const emptyForm = {
  id: "",
  stockCode: "",
  stockName: "",
  market: "KOSPI",
  targetProfitRate: 20,
  memo: "",
};

type WatchlistTableProps = {
  initialRows: WatchlistRow[];
  initialMessage?: string;
};

export default function WatchlistTable({ initialRows, initialMessage = "" }: WatchlistTableProps) {
  const [rows, setRows] = useState<WatchlistRow[]>(initialRows);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage);

  async function loadRows() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/watchlist", { cache: "no-store" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setRows(result.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "관심종목을 불러오지 못했습니다.");
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
      const response = await fetch("/api/watchlist", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setForm(emptyForm);
      setMessage(isEdit ? "관심종목을 수정했습니다." : "관심종목을 저장했습니다.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("이 관심종목을 삭제할까요?")) return;

    setLoading(true);
    setMessage("");
    try {
      const response = await fetch(`/api/watchlist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setMessage("관심종목을 삭제했습니다.");
      await loadRows();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-2">
        <input type="hidden" value={form.id} />
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          종목코드
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
            value={form.stockCode}
            onChange={(event) => setForm((prev) => ({ ...prev, stockCode: event.target.value }))}
            placeholder="005930"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          종목명
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
            value={form.stockName}
            onChange={(event) => setForm((prev) => ({ ...prev, stockName: event.target.value }))}
            placeholder="삼성전자"
            required
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          시장
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
            value={form.market}
            onChange={(event) => setForm((prev) => ({ ...prev, market: event.target.value }))}
          >
            <option value="KOSPI">KOSPI</option>
            <option value="KOSDAQ">KOSDAQ</option>
            <option value="KONEX">KONEX</option>
            <option value="UNKNOWN">UNKNOWN</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          메모
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-normal"
            value={form.memo}
            onChange={(event) => setForm((prev) => ({ ...prev, memo: event.target.value }))}
            placeholder="관심 사유"
          />
        </label>
        <div className="lg:col-span-2">
          <TargetProfitSlider
            value={form.targetProfitRate}
            onChange={(value) => setForm((prev) => ({ ...prev, targetProfitRate: value }))}
          />
        </div>
        <div className="flex gap-2 lg:col-span-2">
          <Button disabled={loading} type="submit">
            {form.id ? "수정 저장" : "관심종목 저장"}
          </Button>
          {form.id ? (
            <Button type="button" variant="secondary" onClick={() => setForm(emptyForm)}>
              취소
            </Button>
          ) : null}
        </div>
      </form>

      {message ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">{message}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">종목</th>
              <th className="px-4 py-3">시장</th>
              <th className="px-4 py-3">목표수익률</th>
              <th className="px-4 py-3">메모</th>
              <th className="px-4 py-3">최근 분석</th>
              <th className="px-4 py-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  {loading ? "불러오는 중..." : "저장된 관심종목이 없습니다."}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-950">{row.stockName}</div>
                    <div className="text-xs text-slate-500">{row.stockCode}</div>
                  </td>
                  <td className="px-4 py-3">{row.market}</td>
                  <td className="px-4 py-3">{row.targetProfitRate}%</td>
                  <td className="px-4 py-3">{row.memo || "-"}</td>
                  <td className="px-4 py-3">{row.lastAnalyzedAt || "-"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setForm({
                            id: row.id,
                            stockCode: row.stockCode,
                            stockName: row.stockName,
                            market: row.market,
                            targetProfitRate: Number(row.targetProfitRate) || 20,
                            memo: row.memo,
                          })
                        }
                      >
                        수정
                      </Button>
                      <Button type="button" size="sm" variant="secondary" onClick={() => handleDelete(row.id)}>
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
