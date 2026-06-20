"use client";

import { useState } from "react";
import IntradayRecommendationTable from "@/components/IntradayRecommendationTable";
import { Button } from "@/components/ui/button";
import type { IntradayScanSnapshot } from "@/lib/intradayTypes";

export default function IntradayScannerPanel({ initial }: { initial: IntradayScanSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initial.message);

  async function runScan() {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/intraday/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: snapshot.target }),
      });
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error ?? "장중 스캔 실패");
      setSnapshot(payload.data);
      setMessage(payload.message ?? payload.data.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "장중 스캔 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div>
          <p className="text-sm font-bold text-slate-950">장중 스캔 대상: {snapshot.target}</p>
          <p className="mt-1 text-xs text-slate-500">{message}</p>
        </div>
        <Button type="button" onClick={runScan} disabled={loading}>
          {loading ? "조회 중..." : "장중 스냅샷 새로고침"}
        </Button>
      </div>
      <IntradayRecommendationTable candidates={snapshot.candidates} />
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-800">
        본 화면은 조회, 분석, 추천 보조 전용입니다. 실제 주문은 실행되지 않으며 자동매매 기능도 없습니다.
      </p>
    </div>
  );
}
