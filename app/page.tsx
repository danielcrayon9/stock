import Link from "next/link";
import { ArrowRight, Radar, Sparkles, ShieldCheck } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <>
      <section className="rounded-3xl bg-slate-950 p-8 text-white">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">시장 스캐너</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">대한민국 주식시장 분석 시스템</h1>
          <p className="mt-5 text-lg leading-8 text-slate-300">
            종목을 직접 입력하지 않아도 됩니다. KOSPI 200과 KOSDAQ 상위 후보군을 자동으로 스캔해
            현재 매수 가능성이 높은 종목을 점수화하고 추천 유형별로 분류합니다.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/scanner"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              시장 스캔 시작 <Radar className="h-4 w-4" />
            </Link>
            <Link
              href="/recommendations"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-bold text-white"
            >
              추천 종목 보기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Radar className="h-8 w-8 text-cyan-600" />
            <CardTitle>자동 시장 스캔</CardTitle>
            <CardDescription>
              유니버스를 자동 구성하고 일·주·월·년봉, 거래대금, 추세, 지지/저항, 공시, 실적, 뉴스, 리스크를 일괄 분석합니다.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Sparkles className="h-8 w-8 text-emerald-600" />
            <CardTitle>추천 유형 분류</CardTitle>
            <CardDescription>
              즉시 관심 · 분할매수 · 눌림목 대기 · 돌파 관심 · 제외 후보로 구분합니다. 상위 후보만 AI가 최종 판단합니다.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <ShieldCheck className="h-8 w-8 text-blue-600" />
            <CardTitle>투자 판단 보조</CardTitle>
            <CardDescription>
              자동매매·주문 기능은 제공하지 않습니다. 본 분석은 투자 판단 보조용이며 매수·매도 추천이 아닙니다.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}
