"use client";

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { OhlcvPeriod, TechnicalIndicatorPoint } from "@/lib/types";
import { formatKRW } from "@/lib/formatters";

type StockChartProps = {
  points: TechnicalIndicatorPoint[];
  period: OhlcvPeriod;
  onPeriodChange: (period: OhlcvPeriod) => void;
  loading?: boolean;
  errorMessage?: string;
  statusMessage?: string;
  supportLevel?: number | null;
  resistanceLevel?: number | null;
};

const PERIOD_OPTIONS: Array<{ value: OhlcvPeriod; label: string }> = [
  { value: "daily", label: "일봉" },
  { value: "weekly", label: "주봉" },
  { value: "monthly", label: "월봉" },
  { value: "yearly", label: "년봉" },
];

type ChartRow = TechnicalIndicatorPoint & {
  span: number;
  isUp: boolean;
  supportLine: number | null;
  resistanceLine: number | null;
};

function toChartRows(
  points: TechnicalIndicatorPoint[],
  supportLevel: number | null | undefined,
  resistanceLevel: number | null | undefined,
): ChartRow[] {
  return points.map((point) => ({
    ...point,
    span: Math.max(point.high - point.low, 1),
    isUp: point.close >= point.open,
    supportLine: supportLevel ?? null,
    resistanceLine: resistanceLevel ?? null,
  }));
}

function formatAxisDate(date: string, period: OhlcvPeriod) {
  if (period === "yearly") return date.slice(0, 4);
  if (period === "monthly") return date.slice(0, 7);
  return date.slice(5);
}

export default function StockChart({
  points,
  period,
  onPeriodChange,
  loading = false,
  errorMessage,
  statusMessage,
  supportLevel,
  resistanceLevel,
}: StockChartProps) {
  const chartRows = useMemo(() => toChartRows(points, supportLevel, resistanceLevel), [points, supportLevel, resistanceLevel]);
  const visibleRows = chartRows.slice(-Math.min(chartRows.length, period === "daily" ? 120 : 80));
  const priceDomain = useMemo(() => {
    if (visibleRows.length === 0) return [0, 100];
    const min = Math.min(...visibleRows.map((row) => row.low));
    const max = Math.max(...visibleRows.map((row) => row.high));
    const padding = (max - min) * 0.08 || max * 0.05;
    return [Math.max(0, min - padding), max + padding];
  }, [visibleRows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onPeriodChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              period === option.value
                ? "bg-slate-950 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
          차트 데이터를 불러오는 중입니다.
        </div>
      ) : null}

      {!loading && errorMessage ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      {!loading && !errorMessage && visibleRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          표시할 차트 데이터가 없습니다. 시세 API 연결 상태를 확인해 주세요.
        </div>
      ) : null}

      {!loading && !errorMessage && visibleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-4">
          {statusMessage ? <p className="mb-3 text-xs text-slate-500">{statusMessage}</p> : null}
          <ComposedChart width={920} height={320} data={visibleRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatAxisDate(String(value), period)}
              minTickGap={24}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="price"
              domain={priceDomain}
              tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`}
              tick={{ fontSize: 11 }}
              width={48}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.[0]?.payload) return null;
                const row = payload[0].payload as ChartRow;
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-sm">
                    <p className="font-semibold text-slate-950">기준일: {label}</p>
                    <p>시가: {formatKRW(row.open)}</p>
                    <p>고가: {formatKRW(row.high)}</p>
                    <p>저가: {formatKRW(row.low)}</p>
                    <p>종가: {formatKRW(row.close)}</p>
                    <p>거래량: {row.volume.toLocaleString("ko-KR")}</p>
                    <p>거래대금: {formatKRW(row.tradingValue)}</p>
                  </div>
                );
              }}
            />
            <Bar yAxisId="price" dataKey="low" stackId="candle" barSize={10} fill="transparent" />
            <Bar yAxisId="price" dataKey="span" stackId="candle" barSize={10}>
              {visibleRows.map((row) => (
                <Cell key={`${row.date}-span`} fill={row.isUp ? "#ef4444" : "#2563eb"} opacity={0.25} />
              ))}
            </Bar>
            <Bar yAxisId="price" dataKey="open" stackId="open" barSize={4} fill="#64748b" />
            <Bar yAxisId="price" dataKey="close" stackId="close" barSize={4}>
              {visibleRows.map((row) => (
                <Cell key={`${row.date}-close`} fill={row.isUp ? "#ef4444" : "#2563eb"} />
              ))}
            </Bar>
            <Line yAxisId="price" type="monotone" dataKey="ma20" stroke="#f59e0b" dot={false} strokeWidth={1.5} name="MA20" />
            <Line yAxisId="price" type="monotone" dataKey="ma60" stroke="#7c3aed" dot={false} strokeWidth={1.5} name="MA60" />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="supportLine"
              stroke="#059669"
              dot={false}
              strokeDasharray="4 4"
              name="지지선"
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="resistanceLine"
              stroke="#dc2626"
              dot={false}
              strokeDasharray="4 4"
              name="저항선"
            />
          </ComposedChart>

          <ComposedChart width={920} height={120} data={visibleRows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatAxisDate(String(value), period)}
              minTickGap={24}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickFormatter={(value) => `${Math.round(Number(value) / 1_000_000)}M`}
              tick={{ fontSize: 11 }}
              width={48}
            />
            <Tooltip
              formatter={(value) => [Number(value).toLocaleString("ko-KR"), "거래량"]}
              labelFormatter={(label) => `기준일: ${label}`}
            />
            <Bar dataKey="volume" fill="#94a3b8" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </div>
      ) : null}
    </div>
  );
}
