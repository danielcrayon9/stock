"use client";

import { useEffect, useRef, useState } from "react";
import { Database, Radar, RefreshCw, RotateCcw } from "lucide-react";
import RecommendationTable from "@/components/RecommendationTable";
import ScanProgress from "@/components/ScanProgress";
import ScannerFilters, { type ScannerFilterValue } from "@/components/ScannerFilters";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/formatters";
import type { ScanRunResponse } from "@/lib/types";

const DEFAULT_FILTERS: ScannerFilterValue = {
  target: "KOSPI200_KOSDAQ100",
  targetProfitRate: 20,
  minTradingValue: 5_000_000_000,
  minMarketCap: 0,
  riskProfile: "neutral",
};

type MarketScannerFormProps = {
  initial: ScanRunResponse | null;
};

type UniverseInfo = {
  type: string;
  count: number;
  source: string;
  message: string;
};

const UNIVERSE_SOURCE_LABELS: Record<string, string> = {
  sheet: "캐시(시트)",
  seed: "시드 · 데이터 부족",
};

function universeSourceLabel(source: string): string {
  return UNIVERSE_SOURCE_LABELS[source] ?? source;
}

export default function MarketScannerForm({ initial }: MarketScannerFormProps) {
  const [filters, setFilters] = useState<ScannerFilterValue>(DEFAULT_FILTERS);
  const [forceRescan, setForceRescan] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [response, setResponse] = useState<ScanRunResponse | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [universeInfo, setUniverseInfo] = useState<UniverseInfo | null>(null);
  const [universeLoading, setUniverseLoading] = useState(false);
  const [universeReloadKey, setUniverseReloadKey] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const target = filters.target;

    const loadUniverseInfo = async () => {
      setUniverseLoading(true);
      try {
        const res = await fetch(`/api/universe?type=${target}`);
        const payload = await res.json();
        if (active && payload.ok) {
          setUniverseInfo({
            type: payload.data.type,
            count: payload.data.count,
            source: payload.data.source,
            message: payload.data.message,
          });
        }
      } catch {
        // 유니버스 정보 로드 실패는 조용히 무시한다.
      } finally {
        if (active) setUniverseLoading(false);
      }
    };

    void loadUniverseInfo();
    return () => {
      active = false;
    };
  }, [filters.target, universeReloadKey]);

  function startSimulatedProgress() {
    setProgress(4);
    progressTimer.current = setInterval(() => {
      setProgress((prev) => (prev >= 92 ? prev : prev + Math.max(1, Math.round((95 - prev) / 12))));
    }, 700);
  }

  function stopSimulatedProgress() {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  async function runScan() {
    setScanning(true);
    setError(null);
    setNotice(null);
    startSimulatedProgress();

    try {
      const res = await fetch("/api/scanner/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, forceRescan }),
      });
      const payload = await res.json();
      if (!payload.ok) {
        setError(payload.error ?? "스캔에 실패했습니다.");
      } else {
        setResponse(payload.data as ScanRunResponse);
        setProgress(100);
      }
    } catch {
      setError("스캔 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      stopSimulatedProgress();
      setScanning(false);
    }
  }

  async function loadLatest() {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/scanner/latest");
      const payload = await res.json();
      if (!payload.ok) {
        setError(payload.error ?? "최근 결과를 불러오지 못했습니다.");
      } else if (!payload.data) {
        setNotice(payload.message ?? "저장된 스캔 결과가 없습니다.");
      } else {
        setResponse(payload.data as ScanRunResponse);
      }
    } catch {
      setError("최근 결과 요청 중 네트워크 오류가 발생했습니다.");
    }
  }

  async function refreshUniverse() {
    setError(null);
    setNotice("유니버스를 갱신하는 중입니다...");
    try {
      const res = await fetch("/api/universe/refresh", { method: "POST" });
      const payload = await res.json();
      setNotice(payload.ok ? payload.data?.message ?? "유니버스를 갱신했습니다." : payload.error ?? "유니버스 갱신 실패");
      if (payload.ok) setUniverseReloadKey((key) => key + 1);
    } catch {
      setNotice("유니버스 갱신 중 네트워크 오류가 발생했습니다.");
    }
  }

  function toggleAutoScan() {
    const next = !autoScan;
    setAutoScan(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("scannerAutoScan", next ? "on" : "off");
    }
  }

  const run = response?.run ?? null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>스캔 조건</CardTitle>
          <CardDescription>
            대상 시장과 필터를 설정한 뒤 스캔을 실행하세요. 같은 날 같은 조건은 캐시 결과를 우선 보여주며, 강제 재스캔으로 새로 분석할 수 있습니다.
          </CardDescription>
        </CardHeader>

        <ScannerFilters value={filters} onChange={setFilters} disabled={scanning} />

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button type="button" onClick={runScan} disabled={scanning}>
            <Radar className="h-4 w-4" />
            {scanning ? "스캔 중..." : "스캔 실행"}
          </Button>
          <Button type="button" variant="secondary" onClick={loadLatest} disabled={scanning}>
            <RotateCcw className="h-4 w-4" />
            최근 스캔 결과 불러오기
          </Button>
          <Button type="button" variant="outline" onClick={refreshUniverse} disabled={scanning}>
            <RefreshCw className="h-4 w-4" />
            유니버스 갱신
          </Button>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={forceRescan} onChange={(event) => setForceRescan(event.target.checked)} />
            강제 재스캔
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={autoScan} onChange={toggleAutoScan} />
            자동 스캔
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          자동 스캔은 Vercel Cron으로 장 시작 전·장중·장 마감 후 서버에서 실행됩니다. 위 토글은 UI 표시용 설정입니다.
        </p>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-4 w-4 text-slate-500" />
            유니버스 현황
          </CardTitle>
          <CardDescription>
            {universeLoading
              ? "유니버스를 불러오는 중입니다..."
              : universeInfo?.message ?? "유니버스 정보를 불러올 수 없습니다."}
          </CardDescription>
        </CardHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-100 p-3">
            <p className="text-xs text-slate-500">대상 유니버스</p>
            <p className="text-lg font-bold text-slate-900">{universeInfo?.type ?? filters.target}</p>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <p className="text-xs text-slate-500">구성 종목 수</p>
            <p className="text-lg font-bold text-slate-900">{universeInfo ? `${universeInfo.count}종목` : "—"}</p>
          </div>
          <div className="rounded-xl border border-slate-100 p-3">
            <p className="text-xs text-slate-500">데이터 출처</p>
            <p
              className={`text-lg font-bold ${
                universeInfo?.source === "seed" ? "text-amber-600" : "text-slate-900"
              }`}
            >
              {universeInfo ? universeSourceLabel(universeInfo.source) : "—"}
            </p>
          </div>
        </div>
        {universeInfo?.source === "seed" ? (
          <p className="mt-3 text-xs font-semibold text-amber-700">
            현재 번들 시드를 사용 중입니다. `유니버스 갱신`을 눌러 KOSPI 200/KOSDAQ 150 공식 구성종목을 가져오세요.
          </p>
        ) : null}
      </Card>

      {scanning ? (
        <ScanProgress percent={progress} currentName={null} message="유니버스를 분석하고 있습니다..." />
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">{notice}</p>
      ) : null}

      {run ? (
        <Card>
          <CardHeader>
            <CardTitle>스캔 요약</CardTitle>
            <CardDescription>{response?.message}</CardDescription>
          </CardHeader>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">분석 종목</p>
              <p className="text-lg font-bold text-slate-900">{run.totalScanned}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">1차 통과</p>
              <p className="text-lg font-bold text-slate-900">{run.totalPassed}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">추천 후보</p>
              <p className="text-lg font-bold text-slate-900">{run.totalRecommended}</p>
            </div>
            <div className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">분석 시각</p>
              <p className="text-sm font-semibold text-slate-900">{formatDateTime(run.finishedAt)}</p>
            </div>
          </div>
          {response?.cached ? (
            <p className="mt-3 text-xs font-semibold text-amber-700">캐시된 결과입니다. 강제 재스캔으로 최신 데이터를 분석할 수 있습니다.</p>
          ) : null}
        </Card>
      ) : null}

      {response ? (
        <div className="space-y-3">
          <h2 className="text-xl font-black">스캔 결과</h2>
          <RecommendationTable results={response.results} />
        </div>
      ) : null}
    </div>
  );
}
