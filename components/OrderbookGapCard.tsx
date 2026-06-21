import { formatScore } from "@/lib/formatters";
import type { OrderbookCheck } from "@/lib/intradayTypes";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  stockCode?: string;
  stockName?: string;
  score?: number | null;
  checks?: OrderbookCheck[];
  metrics?: {
    ask5Qty: number;
    bid5Qty: number;
    ask10Qty: number;
    bid10Qty: number;
    spreadRate: number | null;
    tradeStrength: number | null;
  };
  dataSource?: string;
};

function checkTone(check: OrderbookCheck): string {
  if (check.passed == null) return "text-slate-500 bg-slate-50";
  if (check.scoreDelta < 0 && check.passed) return "text-rose-700 bg-rose-50";
  if (check.scoreDelta > 0 && check.passed) return "text-emerald-700 bg-emerald-50";
  return "text-slate-600 bg-slate-50";
}

export default function OrderbookGapCard({
  stockCode,
  stockName,
  score = null,
  checks = [],
  metrics,
  dataSource,
}: Props) {
  const defaultChecks: OrderbookCheck[] = [
    { id: "thin-ask", label: "상방 5호가 매도잔량 얇음", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "thick-bid", label: "하방 5호가 매수잔량 두꺼움", passed: null, scoreDelta: 10, detail: "분석 대기" },
    { id: "absorb", label: "매도벽 거래대금 소화", passed: null, scoreDelta: 15, detail: "분석 대기" },
    { id: "upper", label: "상방 호가 공백", passed: null, scoreDelta: 5, detail: "분석 대기" },
    { id: "lower", label: "하방 호가 공백 과다", passed: null, scoreDelta: -20, detail: "분석 대기" },
    { id: "spread", label: "스프레드 과다", passed: null, scoreDelta: -15, detail: "분석 대기" },
    { id: "strength", label: "체결강도 약화", passed: null, scoreDelta: -10, detail: "분석 대기" },
    { id: "wall", label: "매도벽 과다", passed: null, scoreDelta: -15, detail: "분석 대기" },
  ];

  const items = checks.length > 0 ? checks : defaultChecks;

  return (
    <Card>
      <CardHeader>
        <CardTitle>호가 공백 분석 (4단계)</CardTitle>
        <CardDescription>
          5/10호가 잔량, 상·하방 공백, 매도벽·스프레드·체결강도를 조회 전용으로 점수화합니다.
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {stockCode ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <p className="font-bold text-slate-950">
              {stockName ?? stockCode} · 호가 {score == null ? "대기" : formatScore(score)}점
            </p>
            {metrics ? (
              <p className="mt-1 text-xs text-slate-500">
                매도5 {metrics.ask5Qty.toLocaleString()} / 매수5 {metrics.bid5Qty.toLocaleString()}
                {metrics.spreadRate != null ? ` · 스프레드 ${metrics.spreadRate.toFixed(2)}%` : ""}
                {metrics.tradeStrength != null ? ` · 체결강도 ${metrics.tradeStrength.toFixed(0)}` : ""}
              </p>
            ) : null}
            {dataSource ? <p className="mt-1 text-xs text-amber-700">{dataSource}</p> : null}
          </div>
        ) : (
          <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
            호가 원천 데이터는 Google Sheets에 대량 저장하지 않고 realtime-worker 또는 캐시에만 보관합니다.
          </p>
        )}
        <div className="grid gap-2 text-sm">
          {items.map((check) => (
            <div key={check.id} className={`rounded-xl px-3 py-2 font-semibold ${checkTone(check)}`}>
              <div className="flex items-center justify-between gap-2">
                <span>{check.label}</span>
                <span className="text-xs">
                  {check.passed == null
                    ? "—"
                    : check.scoreDelta > 0
                      ? check.passed
                        ? `+${check.scoreDelta}`
                        : "0"
                      : check.passed
                        ? check.scoreDelta
                        : "0"}
                </span>
              </div>
              <p className="mt-0.5 text-xs font-normal opacity-80">{check.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
