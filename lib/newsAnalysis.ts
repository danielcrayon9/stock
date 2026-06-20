import type { NewsItem, Sentiment } from "@/lib/types";

const POSITIVE_NEWS_KEYWORDS = [
  "수주",
  "공급",
  "계약",
  "실적 개선",
  "흑자전환",
  "최대 실적",
  "증설",
  "투자",
  "승인",
  "정책 수혜",
  "자사주",
  "배당",
  "합병",
  "인수",
  "기술 개발",
  "양산",
  "수출",
  "글로벌",
];

const NEGATIVE_NEWS_KEYWORDS = [
  "적자",
  "급락",
  "소송",
  "리콜",
  "규제",
  "과징금",
  "횡령",
  "배임",
  "감자",
  "유상증자",
  "전환사채",
  "파업",
  "공급 차질",
  "실적 부진",
  "피크아웃",
  "목표가 하향",
  "투자의견 하향",
  "상장폐지",
  "관리종목",
];

const PERFORMANCE_KEYWORDS = ["실적", "매출", "영업이익", "순이익", "흑자", "적자", "EPS", "PER"];
const RISK_KEYWORDS = ["소송", "리콜", "규제", "횡령", "배임", "상장폐지", "관리종목", "파업"];
const THEME_KEYWORDS = ["테마", "정책", "수혜", "관련주", "기대감"];

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").trim();
}

function findKeywords(text: string, keywords: string[]) {
  return keywords.filter((keyword) => text.includes(keyword));
}

export function normalizeNewsText(value: string) {
  return stripHtml(value);
}

export function classifyNews(title: string, summary: string): {
  sentiment: Sentiment;
  category: NewsItem["category"];
  matchedKeywords: string[];
} {
  const text = `${title} ${summary}`;
  const positive = findKeywords(text, POSITIVE_NEWS_KEYWORDS);
  const negative = findKeywords(text, NEGATIVE_NEWS_KEYWORDS);

  let sentiment: Sentiment = "neutral";
  let matchedKeywords: string[] = [];
  if (negative.length > 0) {
    sentiment = "negative";
    matchedKeywords = negative;
  } else if (positive.length > 0) {
    sentiment = "positive";
    matchedKeywords = positive;
  }

  let category: NewsItem["category"] = "general";
  if (findKeywords(text, RISK_KEYWORDS).length > 0) category = "risk";
  else if (findKeywords(text, PERFORMANCE_KEYWORDS).length > 0) category = "performance";
  else if (findKeywords(text, THEME_KEYWORDS).length > 0) category = "theme";

  return { sentiment, category, matchedKeywords };
}

export function dedupeNews(items: NewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.title}-${item.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function calculateNewsScore(items: NewsItem[]) {
  if (items.length === 0) return null;
  const positiveCount = items.filter((item) => item.sentiment === "positive").length;
  const negativeCount = items.filter((item) => item.sentiment === "negative").length;
  const riskCount = items.filter((item) => item.category === "risk").length;
  const score = 50 + positiveCount * 7 - negativeCount * 12 - riskCount * 8;
  return Math.max(0, Math.min(100, score));
}
