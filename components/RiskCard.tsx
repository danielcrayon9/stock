import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScoreResult, VolumeAnalysisResult } from "@/lib/types";

function getRiskLabel(score: number | null) {
  if (score == null) return { label: "데이터 부족", className: "bg-slate-100 text-slate-600" };
  if (score >= 70) return { label: "높음", className: "bg-red-100 text-red-700" };
  if (score >= 45) return { label: "보통", className: "bg-amber-100 text-amber-700" };
  return { label: "낮음", className: "bg-emerald-100 text-emerald-700" };
}

export default function RiskCard({ score, volume }: { score: ScoreResult; volume: VolumeAnalysisResult }) {
  const risk = getRiskLabel(score.riskScore);
  const riskMessages = [
    volume.isHighAreaDistributionRisk ? "고점권 거래대금 급증 음봉 위험" : null,
    volume.isDrying ? "거래대금 감소로 수급 약화" : null,
    score.riskScore != null && score.riskScore >= 70 ? "변동성/과열 위험 점검 필요" : null,
  ].filter(Boolean);

  return (
    <Card>
      <CardHeader>
        <CardTitle>리스크 점검</CardTitle>
        <CardDescription>손실 가능성을 줄이기 위한 참고 지표입니다.</CardDescription>
      </CardHeader>
      <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
        <span className="text-sm font-semibold text-slate-600">리스크 등급</span>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${risk.className}`}>{risk.label}</span>
      </div>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        {riskMessages.length > 0 ? (
          riskMessages.map((message, index) => <p key={`${index}-${message}`}>- {message}</p>)
        ) : (
          <p>현재 데이터 기준 특이 리스크 신호는 제한적입니다.</p>
        )}
      </div>
    </Card>
  );
}
