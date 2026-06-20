"use client";

import TargetProfitSlider from "@/components/TargetProfitSlider";
import {
  MIN_MARKET_CAP_OPTIONS,
  MIN_TRADING_VALUE_OPTIONS,
  RISK_PROFILES,
  RISK_PROFILE_LABELS,
  SCAN_TARGET_OPTIONS,
  UNIVERSE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { RiskProfile, ScanTarget } from "@/lib/types";

export type ScannerFilterValue = {
  target: ScanTarget;
  targetProfitRate: number;
  minTradingValue: number;
  minMarketCap: number;
  riskProfile: RiskProfile;
};

type ScannerFiltersProps = {
  value: ScannerFilterValue;
  onChange: (value: ScannerFilterValue) => void;
  disabled?: boolean;
};

export default function ScannerFilters({ value, onChange, disabled }: ScannerFiltersProps) {
  function update(patch: Partial<ScannerFilterValue>) {
    onChange({ ...value, ...patch });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">스캔 대상</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {SCAN_TARGET_OPTIONS.map((target) => (
            <button
              key={target}
              type="button"
              disabled={disabled}
              onClick={() => update({ target })}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                value.target === target
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {UNIVERSE_LABELS[target]}
            </button>
          ))}
        </div>
      </div>

      <TargetProfitSlider value={value.targetProfitRate} onChange={(rate) => update({ targetProfitRate: rate })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">최소 거래대금</span>
          <select
            disabled={disabled}
            value={value.minTradingValue}
            onChange={(event) => update({ minTradingValue: Number(event.target.value) })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {MIN_TRADING_VALUE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">최소 시가총액</span>
          <select
            disabled={disabled}
            value={value.minMarketCap}
            onChange={(event) => update({ minMarketCap: Number(event.target.value) })}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            {MIN_MARKET_CAP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-700">리스크 성향</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {RISK_PROFILES.map((profile) => (
            <button
              key={profile}
              type="button"
              disabled={disabled}
              onClick={() => update({ riskProfile: profile })}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                value.riskProfile === profile
                  ? "border-slate-950 bg-slate-950 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {RISK_PROFILE_LABELS[profile]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
