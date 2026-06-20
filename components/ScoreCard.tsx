export default function ScoreCard({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-950">{score == null ? "데이터 부족" : `${score}점`}</p>
    </div>
  );
}
