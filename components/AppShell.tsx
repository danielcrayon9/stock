import type { ReactNode } from "react";
import { assertReadOnlySafety } from "@/lib/safetyGuard";
import Disclaimer from "./Disclaimer";
import MobileNavigation from "./MobileNavigation";
import Navigation from "./Navigation";

export default function AppShell({ children }: { children: ReactNode }) {
  assertReadOnlySafety();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white p-5 lg:block">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">Korea Stock AI</p>
          <h1 className="mt-2 text-xl font-black">보수적 주식 분석</h1>
        </div>
        <Navigation />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/85 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Korea Stock AI</p>
            <h1 className="text-base font-black">보수적 주식 분석</h1>
          </div>
          <MobileNavigation />
        </header>
        <main className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-8">
          {children}
          <Disclaimer />
        </main>
      </div>
    </div>
  );
}
