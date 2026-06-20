import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function MinuteFlowCard() {
  const checks = [
    "5분봉 VWAP 위 여부",
    "5분봉 20MA 위 여부",
    "최근 3개 5분봉 고점/저점 상승",
    "전고점 돌파 후 안착",
    "VWAP/20MA 이탈 경고",
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>분봉 흐름 분석</CardTitle>
        <CardDescription>1분/3분/5분/15분봉 구조를 수용하며 기본 판단은 5분봉 기준입니다.</CardDescription>
      </CardHeader>
      <div className="grid gap-2 text-sm text-slate-600">
        {checks.map((item) => (
          <div key={item} className="rounded-xl bg-slate-50 px-3 py-2 font-semibold">
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}
