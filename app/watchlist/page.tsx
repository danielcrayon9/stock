import WatchlistTable, { type WatchlistRow } from "@/components/WatchlistTable";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRows, GoogleSheetsConfigError } from "@/lib/googleSheets";

async function getInitialWatchlist() {
  try {
    return { rows: await getRows<WatchlistRow>("watchlist"), message: "" };
  } catch (error) {
    const message =
      error instanceof GoogleSheetsConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "관심종목을 불러오지 못했습니다.";
    return { rows: [], message };
  }
}

export default async function WatchlistPage() {
  const { rows, message } = await getInitialWatchlist();

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">관심종목</h1>
        <p className="mt-2 text-slate-500">종목, 목표수익률, 메모, 최근 분석일을 Google Sheets에 저장합니다.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>저장 정책</CardTitle>
          <CardDescription>시세 원천 데이터는 저장하지 않고 사용자 입력값과 분석 요약만 저장합니다.</CardDescription>
        </CardHeader>
        <WatchlistTable initialRows={rows} initialMessage={message} />
      </Card>
    </>
  );
}
