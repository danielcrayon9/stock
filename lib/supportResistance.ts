import type { OhlcvPoint, SupportResistanceResult } from "@/lib/types";

function uniqueNearbyLevels(levels: number[]) {
  const sorted = [...levels].filter(Number.isFinite).sort((left, right) => left - right);
  const result: number[] = [];

  sorted.forEach((level) => {
    const last = result.at(-1);
    if (last == null || Math.abs(level - last) / Math.max(level, 1) > 0.015) {
      result.push(Math.round(level));
    }
  });

  return result;
}

export function findSupportResistance(points: OhlcvPoint[]): SupportResistanceResult {
  if (points.length < 20) {
    return {
      supportLevels: [],
      resistanceLevels: [],
      primarySupport: null,
      primaryResistance: null,
      summary: "지지선/저항선 계산에는 최소 20개 이상의 봉 데이터가 필요합니다.",
    };
  }

  const latestClose = points.at(-1)?.close ?? 0;
  const recent = points.slice(-120);
  const pivotLows: number[] = [];
  const pivotHighs: number[] = [];

  for (let index = 2; index < recent.length - 2; index += 1) {
    const current = recent[index];
    const left = recent.slice(index - 2, index);
    const right = recent.slice(index + 1, index + 3);

    if (left.every((point) => current.low <= point.low) && right.every((point) => current.low <= point.low)) {
      pivotLows.push(current.low);
    }

    if (left.every((point) => current.high >= point.high) && right.every((point) => current.high >= point.high)) {
      pivotHighs.push(current.high);
    }
  }

  const supportLevels = uniqueNearbyLevels(pivotLows)
    .filter((level) => level < latestClose)
    .slice(-5)
    .reverse();
  const resistanceLevels = uniqueNearbyLevels(pivotHighs)
    .filter((level) => level > latestClose)
    .slice(0, 5);

  const primarySupport = supportLevels[0] ?? null;
  const primaryResistance = resistanceLevels[0] ?? null;

  return {
    supportLevels,
    resistanceLevels,
    primarySupport,
    primaryResistance,
    summary:
      primarySupport != null || primaryResistance != null
        ? "최근 120개 봉의 국소 고점/저점으로 주요 가격대를 계산했습니다."
        : "현재가 주변의 유효한 지지/저항 가격대를 찾지 못했습니다.",
  };
}
