import PortfolioTable, { type PortfolioRow } from "@/components/PortfolioTable";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRows, GoogleSheetsConfigError } from "@/lib/googleSheets";

async function getInitialPortfolio() {
  try {
    return { rows: await getRows<PortfolioRow>("portfolio"), message: "" };
  } catch (error) {
    const message =
      error instanceof GoogleSheetsConfigError
        ? error.message
        : error instanceof Error
          ? error.message
          : "보유종목을 불러오지 못했습니다.";
    return { rows: [], message };
  }
}

export default async function PortfolioPage() {
  const { rows, message } = await getInitialPortfolio();

  return (
    <>
      <div>
        <h1 className="text-3xl font-black">보유종목</h1>
        <p className="mt-2 text-slate-500">평균매수가, 수량, 목표수익률, 손절률 기준으로 평가손익을 계산합니다.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>보유종목 관리</CardTitle>
          <CardDescription>실제 주문 기능은 만들지 않으며, 사용자가 입력한 보유 내역만 관리합니다.</CardDescription>
        </CardHeader>
        <PortfolioTable initialRows={rows} initialMessage={message} />
      </Card>
    </>
  );
}
