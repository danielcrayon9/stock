import type { MinuteBar, MinuteFlowCheck } from "@/lib/intradayTypes";
import { normalizeToFiveMinuteBars } from "@/lib/minuteBarBuilder";

export type MinuteFlowResult = {
  score: number | null;
  summary: string;
  signals: string[];
  checks: MinuteFlowCheck[];
  barCount: number;
  latestClose: number | null;
  latestVwap: number | null;
  latestMa20: number | null;
};

function rising(values: number[]): boolean {
  if (values.length < 2) return false;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] <= values[index - 1]) return false;
  }
  return true;
}

function descending(values: number[]): boolean {
  if (values.length < 2) return false;
  for (let index = 1; index < values.length; index += 1) {
    if (values[index] >= values[index - 1]) return false;
  }
  return true;
}

function isBigGreenBar(bar: MinuteBar): boolean {
  if (bar.open <= 0) return false;
  const bodyRate = (bar.close - bar.open) / bar.open;
  const range = bar.high - bar.low;
  const body = Math.abs(bar.close - bar.open);
  return bodyRate >= 0.02 && range > 0 && body / range >= 0.55;
}

function priorHighBreakoutHold(bars: MinuteBar[]): boolean {
  if (bars.length < 8) return false;

  const recent = bars.slice(-3);
  const lookback = bars.slice(-23, -3);
  if (lookback.length === 0) return false;

  const priorHigh = Math.max(...lookback.map((bar) => bar.high));
  const latest = recent.at(-1)!;
  if (latest.close <= priorHigh) return false;

  return recent.every((bar) => bar.close >= priorHigh * 0.998);
}

function bigGreenVolumeSustain(bars: MinuteBar[]): boolean {
  if (bars.length < 6) return false;

  const window = bars.slice(-12);
  for (let index = 0; index < window.length - 2; index += 1) {
    const bar = window[index];
    if (!isBigGreenBar(bar)) continue;

    const follow1 = window[index + 1];
    const follow2 = window[index + 2];
    if (!follow1 || !follow2) continue;

    const threshold = bar.volume * 0.7;
    if (follow1.volume >= threshold && follow2.volume >= threshold) {
      return true;
    }
  }

  return false;
}

function buildCheck(
  id: string,
  label: string,
  passed: boolean | null,
  scoreDelta: number,
  detail: string,
): MinuteFlowCheck {
  return { id, label, passed, scoreDelta, detail };
}

export function analyzeMinuteFlow(inputBars: MinuteBar[]): MinuteFlowResult {
  const bars = normalizeToFiveMinuteBars(inputBars);

  if (bars.length < 3) {
    return {
      score: null,
      summary: "5분봉 데이터 부족 (최소 3개 필요)",
      signals: ["5분봉 데이터 부족"],
      checks: [],
      barCount: bars.length,
      latestClose: bars.at(-1)?.close ?? null,
      latestVwap: bars.at(-1)?.vwap ?? null,
      latestMa20: bars.at(-1)?.ma20 ?? null,
    };
  }

  const latest = bars.at(-1)!;
  const recent3 = bars.slice(-3);
  const lows = recent3.map((bar) => bar.low);
  const highs = recent3.map((bar) => bar.high);

  const aboveVwap = latest.vwap != null && latest.close > latest.vwap;
  const aboveMa20 = latest.ma20 != null && latest.close > latest.ma20;
  const lowsRising = rising(lows);
  const highsRising = rising(highs);
  const breakoutHold = priorHighBreakoutHold(bars);
  const volumeSustain = bigGreenVolumeSustain(bars);
  const vwapBreak = latest.vwap != null && latest.close < latest.vwap;
  const ma20Break = latest.ma20 != null && latest.close < latest.ma20;
  const highsDeclining = descending(highs);

  const checks: MinuteFlowCheck[] = [
    buildCheck(
      "vwap-above",
      "5분봉 VWAP 위",
      latest.vwap == null ? null : aboveVwap,
      aboveVwap ? 10 : 0,
      latest.vwap == null ? "VWAP 계산 불가" : aboveVwap ? "현재가가 VWAP 위" : "VWAP 아래",
    ),
    buildCheck(
      "ma20-above",
      "5분봉 20MA 위",
      latest.ma20 == null ? null : aboveMa20,
      aboveMa20 ? 10 : 0,
      latest.ma20 == null ? "20MA 계산 불가 (20봉 미만)" : aboveMa20 ? "20MA 위" : "20MA 아래",
    ),
    buildCheck(
      "lows-rising",
      "최근 3개 5분봉 저점 상승",
      lowsRising,
      lowsRising ? 10 : 0,
      lowsRising ? "저점 연속 상승" : "저점 상승 미확인",
    ),
    buildCheck(
      "highs-rising",
      "최근 3개 5분봉 고점 상승",
      highsRising,
      highsRising ? 10 : 0,
      highsRising ? "고점 연속 상승" : "고점 상승 미확인",
    ),
    buildCheck(
      "breakout-hold",
      "전고점 돌파 후 안착",
      breakoutHold,
      breakoutHold ? 10 : 0,
      breakoutHold ? "직전 구간 고점 돌파 후 유지" : "돌파 안착 미확인",
    ),
    buildCheck(
      "big-green-volume",
      "장대양봉 후 거래량 유지",
      volumeSustain,
      volumeSustain ? 10 : 0,
      volumeSustain ? "장대양봉 이후 거래량 유지" : "장대양봉·거래량 유지 미확인",
    ),
    buildCheck(
      "vwap-break",
      "VWAP 이탈",
      latest.vwap == null ? null : vwapBreak,
      vwapBreak ? -15 : 0,
      vwapBreak ? "VWAP 하향 이탈" : "VWAP 이탈 없음",
    ),
    buildCheck(
      "ma20-break",
      "5분봉 20MA 이탈",
      latest.ma20 == null ? null : ma20Break,
      ma20Break ? -10 : 0,
      ma20Break ? "20MA 하향 이탈" : "20MA 이탈 없음",
    ),
    buildCheck(
      "highs-declining",
      "분봉상 고점 하락",
      highsDeclining,
      highsDeclining ? -10 : 0,
      highsDeclining ? "최근 3봉 고점 하락" : "고점 하락 패턴 없음",
    ),
  ];

  const score = checks.reduce((sum, check) => sum + check.scoreDelta, 0);
  const positives = checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label);
  const negatives = checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label);

  const signals = [
    ...positives.map((label) => `${label} ✓`),
    ...negatives.map((label) => `${label} ⚠`),
  ];

  if (signals.length === 0) {
    signals.push("분봉 흐름 중립");
  }

  return {
    score,
    summary: `5분봉 흐름 ${score}점 · ${positives.length}개 긍정 · ${negatives.length}개 경고`,
    signals,
    checks,
    barCount: bars.length,
    latestClose: latest.close,
    latestVwap: latest.vwap,
    latestMa20: latest.ma20,
  };
}
