export function formatKRW(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 부족";
  return `${new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 }).format(value)}원`;
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 부족";
  return `${value.toFixed(2)}%`;
}

export function formatEok(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 부족";
  const eok = value / 100_000_000;
  if (Math.abs(eok) >= 10_000) {
    return `${(eok / 10_000).toFixed(2)}조원`;
  }
  return `${Math.round(eok).toLocaleString("ko-KR")}억원`;
}

export function formatScore(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 부족";
  return `${Math.round(value)}점`;
}

export function formatRatio(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "데이터 부족";
  return `1:${value.toFixed(2)}`;
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "데이터 부족";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
