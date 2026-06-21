import { isIntradaySessionNews, isTodayKst, isYesterdayKst } from "@/lib/sampleTodayNews";
import type { TodayNewsCheck } from "@/lib/intradayTypes";
import type { DisclosureItem, NewsItem } from "@/lib/types";

export type TodayNewsAnalysisContext = {
  recent5MinTradingValue?: number | null;
  tradingValueSpike?: boolean;
};

export type TodayNewsHighlight = {
  title: string;
  publishedAt: string;
  isIntraday: boolean;
  category: string;
};

export type TodayNewsAnalysisResult = {
  score: number | null;
  summary: string;
  signals: string[];
  checks: TodayNewsCheck[];
  intradayNewsCount: number;
  todayNewsCount: number;
  highlights: TodayNewsHighlight[];
};

const ORDER_KEYWORDS = ["수주", "수주계약", "납품계약"];
const SUPPLY_PERFORMANCE_KEYWORDS = ["공급", "공급계약", "실적 개선", "흑자전환", "최대 실적", "매출 증가"];
const POLICY_KEYWORDS = ["정부", "정책", "수혜", "지원", "규제 완화"];
const THEME_KEYWORDS = ["테마", "관련주", "기대감", "수혜주"];
const SEVERE_RISK_KEYWORDS = ["유상증자", "전환사채", "CB", "BW", "소송", "규제", "과징금", "횡령", "배임"];
const NEGATIVE_KEYWORDS = ["적자", "급락", "실적 부진", "목표가 하향", "투자의견 하향", "악재"];

function textOf(item: NewsItem): string {
  return `${item.title} ${item.summary}`;
}

function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildCheck(
  id: string,
  label: string,
  passed: boolean | null,
  scoreDelta: number,
  detail: string,
): TodayNewsCheck {
  return { id, label, passed, scoreDelta, detail };
}

function disclosureMatchesNews(disclosures: DisclosureItem[], newsText: string): boolean {
  return disclosures.some((item) => {
    const report = item.reportName;
    return (
      (hasKeyword(newsText, ORDER_KEYWORDS) && hasKeyword(report, ["수주", "공급", "계약"])) ||
      (hasKeyword(newsText, SUPPLY_PERFORMANCE_KEYWORDS) && hasKeyword(report, ["공급", "실적", "매출"])) ||
      (hasKeyword(newsText, SEVERE_RISK_KEYWORDS) && hasKeyword(report, ["증자", "전환", "소송", "제재"]))
    );
  });
}

function newsWithinTradingSpike(publishedAt: string, context: TodayNewsAnalysisContext): boolean {
  if (!context.tradingValueSpike && !context.recent5MinTradingValue) return false;
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  return ageMs >= 0 && ageMs <= 45 * 60 * 1000;
}

export function analyzeTodayNews(
  items: NewsItem[],
  disclosuresToday: DisclosureItem[] = [],
  context: TodayNewsAnalysisContext = {},
): TodayNewsAnalysisResult {
  if (items.length === 0) {
    return {
      score: null,
      summary: "당일 뉴스 데이터 없음",
      signals: ["뉴스 데이터 없음"],
      checks: [],
      intradayNewsCount: 0,
      todayNewsCount: 0,
      highlights: [],
    };
  }

  const todayItems = items.filter((item) => isTodayKst(item.publishedAt) || isIntradaySessionNews(item.publishedAt));
  const intradayItems = items.filter((item) => isIntradaySessionNews(item.publishedAt));
  const analysisPool = todayItems.length > 0 ? todayItems : items.slice(0, 5);

  let intradayOrder = false;
  let supplyPerformance = false;
  let policyBenefit = false;
  let disclosureConfirmed = false;
  let yesterdayRehash = false;
  let themeOnly = false;
  let negativeNews = false;
  let severeRisk = false;

  const highlights: TodayNewsHighlight[] = [];

  for (const item of analysisPool) {
    const text = textOf(item);
    const intraday = isIntradaySessionNews(item.publishedAt);
    const today = isTodayKst(item.publishedAt);

    highlights.push({
      title: item.title,
      publishedAt: item.publishedAt,
      isIntraday: intraday,
      category: item.category,
    });

    if (intraday && hasKeyword(text, ORDER_KEYWORDS)) intradayOrder = true;
    if (today && hasKeyword(text, SUPPLY_PERFORMANCE_KEYWORDS)) supplyPerformance = true;
    if (today && hasKeyword(text, POLICY_KEYWORDS)) policyBenefit = true;
    if (today && disclosureMatchesNews(disclosuresToday, text)) disclosureConfirmed = true;
    if (isYesterdayKst(item.publishedAt) && !today) yesterdayRehash = true;
    if (item.category === "theme" || hasKeyword(text, THEME_KEYWORDS)) themeOnly = true;
    if (item.sentiment === "negative" || hasKeyword(text, NEGATIVE_KEYWORDS)) negativeNews = true;
    if (hasKeyword(text, SEVERE_RISK_KEYWORDS) || item.category === "risk") severeRisk = true;
  }

  if (disclosuresToday.length > 0 && !disclosureConfirmed) {
    disclosureConfirmed = disclosuresToday.some(
      (item) => item.sentiment === "positive" || hasKeyword(item.reportName, ["수주", "공급", "계약", "실적"]),
    );
  }

  const spikeNote = analysisPool.some((item) => newsWithinTradingSpike(item.publishedAt, context));

  const checks: TodayNewsCheck[] = [
    buildCheck(
      "intraday-order",
      "장중 신규 수주",
      analysisPool.length > 0 ? intradayOrder : null,
      intradayOrder ? 20 : 0,
      intradayOrder
        ? `장중 수주 관련 뉴스${spikeNote ? " · 거래대금 반응 시간대 근접" : ""}`
        : "장중 수주 뉴스 없음",
    ),
    buildCheck(
      "supply-performance",
      "공급계약/실적 개선",
      supplyPerformance,
      supplyPerformance ? 15 : 0,
      supplyPerformance ? "공급·실적 개선 키워드 확인" : "공급·실적 호재 없음",
    ),
    buildCheck(
      "policy",
      "정부 정책 수혜",
      policyBenefit,
      policyBenefit ? 10 : 0,
      policyBenefit ? "정책 수혜 키워드 확인" : "정책 수혜 없음",
    ),
    buildCheck(
      "disclosure",
      "공시로 확인 가능",
      disclosuresToday.length > 0 || items.length > 0 ? disclosureConfirmed : null,
      disclosureConfirmed ? 10 : 0,
      disclosureConfirmed
        ? `당일 공시 ${disclosuresToday.length}건과 뉴스 교차 확인`
        : "공시 교차 확인 없음",
    ),
    buildCheck(
      "rehash",
      "전일 뉴스 재탕",
      yesterdayRehash,
      yesterdayRehash ? 2 : 0,
      yesterdayRehash ? "전일 보도 재언급" : "재탕 없음",
    ),
    buildCheck(
      "theme",
      "단순 테마성",
      themeOnly && !intradayOrder && !supplyPerformance,
      themeOnly && !intradayOrder && !supplyPerformance ? 3 : 0,
      themeOnly ? "테마·기대감 중심 보도" : "테마성 없음",
    ),
    buildCheck(
      "negative",
      "악재 뉴스",
      negativeNews && !severeRisk,
      negativeNews && !severeRisk ? -20 : 0,
      negativeNews ? "부정 sentiment/키워드" : "악재 없음",
    ),
    buildCheck(
      "severe-risk",
      "유상증자/CB/소송/규제",
      severeRisk,
      severeRisk ? -25 : 0,
      severeRisk ? "고위험 키워드 확인" : "고위험 키워드 없음",
    ),
  ];

  const score = checks.reduce((sum, check) => sum + (check.passed ? check.scoreDelta : 0), 0);
  const positives = checks.filter((check) => check.scoreDelta > 0 && check.passed).map((check) => check.label);
  const negatives = checks.filter((check) => check.scoreDelta < 0 && check.passed).map((check) => check.label);

  const signals = [
    ...positives.map((label) => `${label} ✓`),
    ...negatives.map((label) => `${label} ⚠`),
  ];
  if (signals.length === 0) signals.push("당일 뉴스 중립");

  return {
    score,
    summary: `당일 뉴스 ${score}점 · ${positives.length}개 긍정 · ${negatives.length}개 경고 · 장중 ${intradayItems.length}건`,
    signals,
    checks,
    intradayNewsCount: intradayItems.length,
    todayNewsCount: todayItems.length,
    highlights: highlights.slice(0, 5),
  };
}
