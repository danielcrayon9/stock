import { DEFAULT_TARGET_PROFIT_RATE, MAX_TARGET_PROFIT_RATE, MIN_TARGET_PROFIT_RATE } from "@/lib/constants";

type TargetProfitSliderProps = {
  value?: number;
  onChange?: (value: number) => void;
};

export default function TargetProfitSlider({ value = DEFAULT_TARGET_PROFIT_RATE, onChange }: TargetProfitSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-slate-700" htmlFor="target-profit">
          목표수익률
        </label>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-bold text-slate-700">
          {value}%
        </span>
      </div>
      <input
        id="target-profit"
        type="range"
        min={MIN_TARGET_PROFIT_RATE}
        max={MAX_TARGET_PROFIT_RATE}
        step={1}
        value={value}
        onChange={(event) => onChange?.(Number(event.target.value))}
        className="w-full"
      />
      <p className="text-xs text-slate-500">3%~100% 범위에서 1% 단위로 조정합니다.</p>
    </div>
  );
}
