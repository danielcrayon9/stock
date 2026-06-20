import AlertCenter from "@/components/AlertCenter";
import { getRows, GoogleSheetsConfigError } from "@/lib/googleSheets";
import type { AlertLog, AlertSetting } from "@/lib/types";

async function loadAlerts() {
  try {
    const [settings, logs] = await Promise.all([
      getRows<AlertSetting>("alert_settings"),
      getRows<AlertLog>("alert_logs"),
    ]);

    return {
      settings,
      logs: logs.sort((left, right) => String(right.sentAt).localeCompare(String(left.sentAt))),
      message: "",
    };
  } catch (error) {
    return {
      settings: [] as AlertSetting[],
      logs: [] as AlertLog[],
      message:
        error instanceof GoogleSheetsConfigError
          ? error.message
          : "알림 데이터를 불러오지 못했습니다. Google Sheets 시트와 환경변수를 확인하세요.",
    };
  }
}

export default async function AlertsPage() {
  const { settings, logs, message } = await loadAlerts();

  return (
    <>
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-700">Phase 7</p>
        <h1 className="text-3xl font-black">알림센터</h1>
        <p className="mt-2 text-slate-500">
          목표수익률, 손절가, 매수가 도달, 거래대금 급증, 악재 공시 조건을 Telegram으로 발송합니다.
        </p>
      </div>
      <AlertCenter initialSettings={settings} initialLogs={logs} initialMessage={message} />
    </>
  );
}
