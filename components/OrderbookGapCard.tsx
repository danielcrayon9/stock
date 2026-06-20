import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OrderbookGapCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>호가 공백 분석</CardTitle>
        <CardDescription>
          현재가 위/아래 5호가와 10호가 잔량, 상방/하방 공백, 매도벽/매수벽, 스프레드, 체결강도를 조회 전용으로 표시합니다.
        </CardDescription>
      </CardHeader>
      <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
        호가 원천 데이터는 Google Sheets에 대량 저장하지 않고 realtime-worker 또는 캐시에만 보관합니다.
      </p>
    </Card>
  );
}
