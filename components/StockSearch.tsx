"use client";

import { FormEvent, useState } from "react";
import { Search } from "lucide-react";
import type { Stock } from "@/lib/types";
import { Button } from "./ui/button";

type StockSearchProps = {
  onSelect: (stock: Stock) => void;
  selectedStock?: Stock | null;
};

export default function StockSearch({ onSelect, selectedStock }: StockSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Stock[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/stocks/search?query=${encodeURIComponent(query)}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);

      setResults(result.data);
      setMessage(result.message ?? "");
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : "종목 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={handleSearch}>
        <label className="relative flex-1">
          <span className="sr-only">종목명 또는 종목코드</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-slate-400"
            placeholder="예: 삼성전자 또는 005930"
          />
        </label>
        <Button type="submit" disabled={loading}>
          {loading ? "검색 중..." : "검색"}
        </Button>
      </form>

      {message ? <p className="text-sm text-slate-500">{message}</p> : null}

      {results.length > 0 ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <ul className="divide-y divide-slate-100">
            {results.map((stock) => {
              const isSelected = selectedStock?.stockCode === stock.stockCode;
              return (
                <li key={stock.stockCode}>
                  <button
                    type="button"
                    onClick={() => onSelect(stock)}
                    className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${
                      isSelected ? "bg-slate-100" : ""
                    }`}
                  >
                    <span>
                      <strong className="text-slate-950">{stock.stockName}</strong>
                      <span className="ml-2 text-slate-500">{stock.stockCode}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {stock.market}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
