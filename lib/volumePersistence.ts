import type { MinuteBar } from "@/lib/intradayTypes";
import { normalizeToFiveMinuteBars } from "@/lib/minuteBarBuilder";
import type { VolumePersistenceContext } from "@/lib/volumePersistenceContext";

export type VolumePersistenceCheck = {
  id: string;
  label: string;
  passed: boolean | null;
  scoreDelta: number;
  detail: string;
};

export type VolumePersistenceResult = {
  score: number | null;
  summary: string;
  signals: string[];
  checks: VolumePersistenceCheck[];
  context: VolumePersistenceContext | null;
  sameTimeRatio: number | null;
};

function sumTradingValue(bars: MinuteBar[]): number {
  return bars.reduce((sum, bar) => sum + bar.tradingValue, 0);
}

function buildCheck(
  id: string,
  label: string,
  passed: boolean | null,
  scoreDelta: number,
  detail: string,
): VolumePersistenceCheck {
  return { id, label, passed, scoreDelta, detail };
}

function hasLongUpperWick(bar: MinuteBar): boolean {
  const range = bar.high - bar.low;
  if (range <= 0) return false;
  const upperWick = bar.high - Math.max(bar.open, bar.close);
  return upperWick / range >= 0.5;
}

function isTradingValueSpike(bar: MinuteBar, average: number): boolean {
  return average > 0 && bar.tradingValue >= average * 2;
}

function tradingValueTrendDown(bars: MinuteBar[]): boolean {
  if (bars.length < 3) return false;
  for (let index = bars.length - 2; index < bars.length; index += 1) {
    if (bars[index].tradingValue >= bars[index - 1].tradingValue) return false;
  }
  return bars.at(-1)!.close > bars[0].close;
}

export function analyzeVolumePersistence(
  inputBars: MinuteBar[],
  context: VolumePersistenceContext | null = null,
): VolumePersistenceResult {
  const bars = normalizeToFiveMinuteBars(inputBars);

  if (bars.length < 6) {
    return {
      score: null,
      summary: "5분봉 6개 미만 — 거래대금 지속성 분석 불가",
      signals: ["분봉 누적 필요"],
      checks: [],
      context,
      sameTimeRatio: context?.sameTimeRatio ?? null,
    };
  }

  const ratio = context?.sameTimeRatio ?? null;
  const sameTime2x = ratio != null && ratio >= 2;

  const recent15 = sumTradingValue(bars.slice(-3));
  const prior15 = sumTradingValue(bars.slice(-6, -3));
  const recent15Increase = prior15 > 0 && recent15 > prior15;

  const recent30 = bars.slice(-6);
  const prior30 = bars.slice(-12, -6);
  const recent30Tv = sumTradingValue(recent30);
  const prior30Tv = prior30.length > 0 ? sumTradingValue(prior30) : prior15;
  const priceUp30m = recent30.at(-1)!.close > recent30[0].close;
  const tvMaintained30m = prior30Tv > 0 && recent30Tv >= prior30Tv * 0.85;
  const priceUpTvMaintain = priceUp30m && tvMaintained30m;

  const surgeSegment = prior15 > 0 && sumTradingValue(bars.slice(-9, -6)) > 0
    ? sumTradingValue(bars.slice(-6, -3)) > sumTradingValue(bars.slice(-9, -6)) * 1.15
    : false;
  const last3 = bars.slice(-3);
  const closeRange = Math.max(...last3.map((bar) => bar.close)) - Math.min(...last3.map((bar) => bar.close));
  const sideways = last3.at(-1)!.close > 0 && closeRange / last3.at(-1)!.close < 0.005;
  const tvIncreaseSideways = surgeSegment && sideways;

  const segmentStartClose = bars.at(-4)?.close ?? bars.at(-1)!.close;
  const tvIncreasePriceDown = surgeSegment && bars.at(-1)!.close < segmentStartClose * 0.998;

  const avgTv = sumTradingValue(bars.slice(-12)) / Math.min(12, bars.length);
  let spikeWithWick = false;
  for (const bar of bars.slice(-8)) {
    if (isTradingValueSpike(bar, avgTv) && hasLongUpperWick(bar)) {
      spikeWithWick = true;
      break;
    }
  }

  const priceUpTvDown = tradingValueTrendDown(bars.slice(-3));

  const recent5Increase =
    context?.recent5MinTradingValue != null &&
    context.prior5MinTradingValue != null &&
    context.prior5MinTradingValue > 0 &&
    context.recent5MinTradingValue > context.prior5MinTradingValue;

  const checks: VolumePersistenceCheck[] = [
    buildCheck(
      "same-time-2x",
      "전일 동시간 대비 2배+",
      ratio == null ? null : sameTime2x,
      sameTime2x ? 15 : 0,
      ratio == null
        ? "전일 동시간 데이터 없음"
        : `동시간 비율 ${ratio.toFixed(2)}배`,
    ),
    buildCheck(
      "recent-15m-increase",
      "최근 15분 거래대금 증가",
      recent15Increase,
      recent15Increase ? 10 : 0,
      recent15Increase
        ? `15분 ${(recent15 / 100_000_000).toFixed(1)}억 > 직전 ${(prior15 / 100_000_000).toFixed(1)}억`
        : "15분 구간 증가 미확인",
    ),
    buildCheck(
      "30m-price-tv",
      "30분 가격↑ + 거래대금 유지",
      priceUpTvMaintain,
      priceUpTvMaintain ? 15 : 0,
      priceUpTvMaintain ? "가격 상승과 거래대금 유지 동반" : "30분 동반 상승 미확인",
    ),
    buildCheck(
      "tv-sideways",
      "거래대금↑ 후 가격 횡보",
      tvIncreaseSideways,
      tvIncreaseSideways ? 5 : 0,
      tvIncreaseSideways ? "급증 후 횡보" : "횡보 패턴 없음",
    ),
    buildCheck(
      "tv-price-down",
      "거래대금↑ 후 가격↓",
      tvIncreasePriceDown,
      tvIncreasePriceDown ? -15 : 0,
      tvIncreasePriceDown ? "거래대금 증가 후 되밀림" : "증가 후 하락 없음",
    ),
    buildCheck(
      "spike-upper-wick",
      "거래대금 급증 + 긴 윗꼬리",
      spikeWithWick,
      spikeWithWick ? -20 : 0,
      spikeWithWick ? "급증 봉 윗꼬리 과다" : "급증·윗꼬리 패턴 없음",
    ),
    buildCheck(
      "price-up-tv-down",
      "가격↑ 중 거래대금↓",
      priceUpTvDown,
      priceUpTvDown ? -10 : 0,
      priceUpTvDown ? "상승 중 거래대금 둔화" : "거래대금 둔화 없음",
    ),
  ];

  if (recent5Increase) {
    checks.push(
      buildCheck(
        "recent-5m-increase",
        "최근 5분 거래대금 증가",
        true,
        0,
        "직전 5분 대비 증가 (참고)",
      ),
    );
  }

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.scoreDelta : 0), 0);
  const positives = checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label);
  const negatives = checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label);

  const signals = [
    ...positives.map((label) => `${label} ✓`),
    ...negatives.map((label) => `${label} ⚠`),
  ];
  if (signals.length === 0) signals.push("거래대금 지속성 중립");

  return {
    score,
    summary: `거래대금 지속성 ${score}점 · ${positives.length}개 긍정 · ${negatives.length}개 경고`,
    signals,
    checks,
    context,
    sameTimeRatio: ratio,
  };
}
