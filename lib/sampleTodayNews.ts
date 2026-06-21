import type { NewsItem } from "@/lib/types";
import { kstDateString } from "@/lib/time";

/** worker/Naver 미연결 시 UI·점수 검증용 당일 뉴스 샘플 */
export function generateSampleTodayNews(stockCode: string, stockName: string): NewsItem[] {
  const now = new Date();
  const todayMorning = new Date(now);
  todayMorning.setHours(now.getHours() - 2, now.getMinutes(), 0, 0);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (stockCode === "005930") {
    return [
      {
        stockCode,
        stockName,
        title: `${stockName}, 대규모 반도체 장비 수주 계약 체결`,
        summary: "장중 공시에 따르면 신규 수주가 확정되었으며 시장에서 거래대금이 동반 증가했다.",
        source: "sample-news",
        url: "https://example.com/news/sample-order",
        publishedAt: todayMorning.toISOString(),
        sentiment: "positive",
        category: "performance",
        matchedKeywords: ["수주", "계약"],
      },
    ];
  }

  if (stockCode === "035720") {
    return [
      {
        stockCode,
        stockName,
        title: `${stockName} AI 테마 관련주 기대감 재부각`,
        summary: "전일 보도된 테마성 기사가 오늘 다시 언급되고 있다.",
        source: "sample-news",
        url: "https://example.com/news/sample-theme",
        publishedAt: yesterday.toISOString(),
        sentiment: "neutral",
        category: "theme",
        matchedKeywords: ["테마", "기대감"],
      },
    ];
  }

  if (stockCode === "247540") {
    return [
      {
        stockCode,
        stockName,
        title: `${stockName}, 전환사채(CB) 발행 검토 보도`,
        summary: "자금 조달 목적 전환사채 발행 가능성이 거론되며 투자심리가 위축될 수 있다.",
        source: "sample-news",
        url: "https://example.com/news/sample-cb",
        publishedAt: todayMorning.toISOString(),
        sentiment: "negative",
        category: "risk",
        matchedKeywords: ["전환사채", "CB"],
      },
    ];
  }

  return [
    {
      stockCode,
      stockName,
      title: `${stockName} 관련 일반 뉴스`,
      summary: "특이 호재·악재 키워드가 없는 일반 보도입니다.",
      source: "sample-news",
      url: "https://example.com/news/sample-general",
      publishedAt: todayMorning.toISOString(),
      sentiment: "neutral",
      category: "general",
      matchedKeywords: [],
    },
  ];
}

export function isTodayKst(iso: string, base = new Date()): boolean {
  return kstDateString(new Date(iso)) === kstDateString(base);
}

export function isYesterdayKst(iso: string, base = new Date()): boolean {
  const yesterday = new Date(base.getTime() - 24 * 60 * 60 * 1000);
  return kstDateString(new Date(iso)) === kstDateString(yesterday);
}

/** KST 장중(09:00~15:30) 발생 뉴스 여부 */
export function isIntradaySessionNews(iso: string): boolean {
  if (!isTodayKst(iso)) return false;
  const date = new Date(iso);
  const kstOffsetMs = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + kstOffsetMs);
  const minutes = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  return minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
}
