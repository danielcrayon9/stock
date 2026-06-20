import AnalyzeWorkspace from "@/components/AnalyzeWorkspace";

export default function AnalyzePage() {
  return (
    <>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-700">Final</p>
        <h1 className="text-3xl font-black">종목 분석</h1>
        <p className="mt-2 text-slate-500">
          기술적 분석, 매수가 계산, 공시/뉴스/실적 데이터를 AI에 전달해 최종 종합 판단을 확인합니다.
        </p>
      </div>
      <AnalyzeWorkspace />
    </>
  );
}
