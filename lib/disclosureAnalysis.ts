import type { DisclosureItem, Sentiment } from "@/lib/types";

const POSITIVE_DISCLOSURE_KEYWORDS = [
  "공급계약",
  "수주",
  "자기주식 취득",
  "자사주 소각",
  "무상증자",
  "배당 확대",
  "흑자전환",
  "영업이익 증가",
  "신규시설투자",
  "기술이전",
  "특허 취득",
  "이전상장",
];

const NEGATIVE_DISCLOSURE_KEYWORDS = [
  "유상증자",
  "전환사채",
  "신주인수권부사채",
  "감자",
  "불성실공시",
  "관리종목",
  "상장폐지",
  "감사의견 거절",
  "횡령",
  "배임",
  "소송",
  "영업손실",
  "적자전환",
  "최대주주 변경",
  "투자주의",
  "투자경고",
  "투자위험",
];

function findKeywords(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword));
}

export function classifyDisclosure(reportName: string): { sentiment: Sentiment; matchedKeywords: string[] } {
  const positive = findKeywords(reportName, POSITIVE_DISCLOSURE_KEYWORDS);
  const negative = findKeywords(reportName, NEGATIVE_DISCLOSURE_KEYWORDS);

  if (negative.length > 0) return { sentiment: "negative", matchedKeywords: negative };
  if (positive.length > 0) return { sentiment: "positive", matchedKeywords: positive };
  return { sentiment: "neutral", matchedKeywords: [] };
}

export function calculateDisclosureScore(items: DisclosureItem[]) {
  if (items.length === 0) return null;
  const positiveCount = items.filter((item) => item.sentiment === "positive").length;
  const negativeCount = items.filter((item) => item.sentiment === "negative").length;
  const score = 50 + positiveCount * 10 - negativeCount * 18;
  return Math.max(0, Math.min(100, score));
}
