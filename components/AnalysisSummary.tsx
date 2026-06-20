import ScoreCard from "@/components/ScoreCard";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKRW } from "@/lib/formatters";
import type {
  ScoreResult,
  SupportResistanceResult,
  TechnicalAnalysisResult,
  VolumeAnalysisResult,
} from "@/lib/types";

type AnalysisSummaryProps = {
  technical: TechnicalAnalysisResult;
  volume: VolumeAnalysisResult;
  supportResistance: SupportResistanceResult;
  score: ScoreResult;
};

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-b-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

export default function AnalysisSummary({
  technical,
  volume,
  supportResistance,
  score,
}: AnalysisSummaryProps) {
  const latest = technical.latest;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>분석 요약</CardTitle>
          <CardDescription>기술적 지표와 거래대금은 참고 점수이며 매수·매도 추천이 아닙니다.</CardDescription>
        </CardHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <ScoreCard label="기술 점수" score={score.technicalScore} />
          <ScoreCard label="거래대금 점수" score={score.volumeScore} />
          <ScoreCard label="리스크 점수" score={score.riskScore} />
        </div>
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-950">{technical.trend.summary}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {[...technical.signals, ...score.reasons].slice(0, 6).map((signal, index) => (
              <li key={`${index}-${signal}`}>- {signal}</li>
            ))}
          </ul>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>핵심 지표</CardTitle>
          <CardDescription>NaN 또는 무한대 값은 표시하지 않고 데이터 부족으로 처리합니다.</CardDescription>
        </CardHeader>
        <div className="rounded-xl border border-slate-100 px-4">
          <DataRow label="RSI14" value={latest?.rsi14 == null ? "데이터 부족" : `${latest.rsi14.toFixed(2)}`} />
          <DataRow label="MACD" value={latest?.macd == null ? "데이터 부족" : `${latest.macd.toFixed(2)}`} />
          <DataRow label="ATR14" value={formatKRW(latest?.atr14)} />
          <DataRow label="52주 고점" value={formatKRW(technical.high52Week)} />
          <DataRow label="52주 저점" value={formatKRW(technical.low52Week)} />
          <DataRow
            label="20봉 거래대금 배율"
            value={volume.tradingValueRatio20 == null ? "데이터 부족" : `${volume.tradingValueRatio20.toFixed(2)}배`}
          />
          <DataRow label="주요 지지선" value={formatKRW(supportResistance.primarySupport)} />
          <DataRow label="주요 저항선" value={formatKRW(supportResistance.primaryResistance)} />
        </div>
        <p className="mt-3 text-sm text-slate-500">{volume.summary}</p>
      </Card>
    </div>
  );
}
