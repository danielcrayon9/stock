import { NextRequest, NextResponse } from "next/server";
import { runMarketScan } from "@/lib/marketScanner";
import { dispatchScanAlerts } from "@/lib/scanAlerts";
import { isKstWeekend } from "@/lib/time";
import type { ScanFilters } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_FILTERS: ScanFilters = {
  target: "KOSPI200_KOSDAQ100",
  targetProfitRate: 20,
  minTradingValue: 5_000_000_000,
  minMarketCap: 0,
  riskProfile: "neutral",
  forceRescan: true,
};

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return true; // 시크릿 미설정 시 통과 (Vercel Cron 기본)
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "인증 실패" }, { status: 401 });
  }

  // 주말에는 자동 스캔을 실행하지 않는다.
  if (isKstWeekend()) {
    return NextResponse.json({ ok: true, data: { skipped: true, reason: "주말에는 자동 스캔을 실행하지 않습니다." } });
  }

  try {
    const response = await runMarketScan(DEFAULT_FILTERS);
    const alerts = await dispatchScanAlerts(response);

    return NextResponse.json({
      ok: true,
      data: {
        scanRunId: response.run.id,
        totalScanned: response.run.totalScanned,
        totalRecommended: response.run.totalRecommended,
        alertsSent: alerts.sent,
        alertsSkipped: alerts.skipped,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "자동 스캔 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
