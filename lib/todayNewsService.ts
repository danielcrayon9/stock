import { getDisclosures } from "@/lib/dartService";
import { getNews } from "@/lib/newsService";
import { generateSampleTodayNews } from "@/lib/sampleTodayNews";
import { kstDateString } from "@/lib/time";
import type { DisclosureItem, NewsItem } from "@/lib/types";

export type TodayNewsSource = "naver" | "sample";

export type TodayNewsFetchResult = {
  items: NewsItem[];
  disclosuresToday: DisclosureItem[];
  source: TodayNewsSource;
  message: string;
};

function filterTodayDisclosures(items: DisclosureItem[]): DisclosureItem[] {
  const today = kstDateString().replace(/-/g, "");
  return items.filter((item) => item.receivedAt === today);
}

export async function getTodayNewsForAnalysis(
  stockCode: string,
  stockName: string,
): Promise<TodayNewsFetchResult> {
  const [newsResult, disclosureResult] = await Promise.all([
    getNews(stockName, stockCode, 2),
    getDisclosures(stockCode, 5).catch(() => ({
      items: [],
      status: "disabled" as const,
      message: "",
      disclosureScore: null,
      positiveCount: 0,
      negativeCount: 0,
    })),
  ]);

  const disclosuresToday = filterTodayDisclosures(disclosureResult.items);

  if (newsResult.status === "ready" && newsResult.items.length > 0) {
    return {
      items: newsResult.items,
      disclosuresToday,
      source: "naver",
      message: newsResult.message,
    };
  }

  if (newsResult.status === "disabled") {
    return {
      items: generateSampleTodayNews(stockCode, stockName),
      disclosuresToday,
      source: "sample",
      message: "Naver API 미설정 — 샘플 당일 뉴스로 분석합니다.",
    };
  }

  return {
    items: generateSampleTodayNews(stockCode, stockName),
    disclosuresToday,
    source: "sample",
    message: "뉴스 API 조회 실패 — 샘플 당일 뉴스로 분석합니다.",
  };
}
