import { appendRow, hasGoogleSheetsConfig } from "@/lib/googleSheets";
import { calculateNewsScore, classifyNews, dedupeNews, normalizeNewsText } from "@/lib/newsAnalysis";
import { nowIso } from "@/lib/utils";
import type { NewsItem, NewsResult } from "@/lib/types";

type NaverNewsItem = {
  title: string;
  originallink?: string;
  link: string;
  description: string;
  pubDate: string;
};

type NaverNewsResponse = {
  items?: NaverNewsItem[];
};

function getNaverConfig() {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function getSource(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "출처 미상";
  }
}

function isWithinDays(date: string, days: number) {
  const publishedAt = new Date(date).getTime();
  if (!Number.isFinite(publishedAt)) return true;
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000;
  return publishedAt >= threshold;
}

async function saveNewsCache(items: NewsItem[]) {
  if (!hasGoogleSheetsConfig()) return;

  await Promise.allSettled(
    items.slice(0, 20).map((item) =>
      appendRow("news_cache", {
        id: crypto.randomUUID(),
        stockCode: item.stockCode,
        stockName: item.stockName,
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment,
        category: item.category,
        createdAt: nowIso(),
      }),
    ),
  );
}

export async function getNews(stockName: string, stockCode: string, days = 7): Promise<NewsResult> {
  const config = getNaverConfig();
  if (!config) {
    return {
      items: [],
      status: "disabled",
      message: "Naver 뉴스 API 키가 설정되지 않았습니다.",
      newsScore: null,
      positiveCount: 0,
      negativeCount: 0,
    };
  }

  try {
    const query = encodeURIComponent(`${stockName} ${stockCode}`);
    const response = await fetch(`https://openapi.naver.com/v1/search/news.json?query=${query}&display=30&sort=date`, {
      headers: {
        "X-Naver-Client-Id": config.clientId,
        "X-Naver-Client-Secret": config.clientSecret,
      },
      next: { revalidate: 1800 },
    });

    if (!response.ok) {
      throw new Error(`Naver 뉴스 API 응답 오류 (${response.status})`);
    }

    const payload = (await response.json()) as NaverNewsResponse;
    const items = dedupeNews(
      (payload.items ?? [])
        .map((item): NewsItem => {
          const title = normalizeNewsText(item.title);
          const summary = normalizeNewsText(item.description);
          const analysis = classifyNews(title, summary);
          const url = item.originallink || item.link;

          return {
            stockCode,
            stockName,
            title,
            summary,
            source: getSource(url),
            url,
            publishedAt: new Date(item.pubDate).toISOString(),
            sentiment: analysis.sentiment,
            category: analysis.category,
            matchedKeywords: analysis.matchedKeywords,
          };
        })
        .filter((item) => isWithinDays(item.publishedAt, days)),
    );

    await saveNewsCache(items);

    return {
      items,
      status: items.length > 0 ? "ready" : "data-unavailable",
      message: items.length > 0 ? `최근 ${days}일 뉴스 ${items.length}건을 조회했습니다.` : "조회 기간 내 뉴스 데이터가 없습니다.",
      newsScore: calculateNewsScore(items),
      positiveCount: items.filter((item) => item.sentiment === "positive").length,
      negativeCount: items.filter((item) => item.sentiment === "negative").length,
    };
  } catch (error) {
    return {
      items: [],
      status: "data-unavailable",
      message: error instanceof Error ? error.message : "뉴스 데이터를 불러오지 못했습니다.",
      newsScore: null,
      positiveCount: 0,
      negativeCount: 0,
    };
  }
}
