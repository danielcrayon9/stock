import { appendRow, getRows, hasGoogleSheetsConfig } from "@/lib/googleSheets";
import { sendAlertToTelegram, hasTelegramConfig } from "@/lib/telegram";
import { kstDateString } from "@/lib/time";
import { nowIso } from "@/lib/utils";
import type { AlertCandidate, ScanRunResponse } from "@/lib/types";

// 새 추천 후보 알림은 즉시 관심/돌파 관심 후보 중 상위 종목으로 제한한다.
const MAX_ALERTS_PER_RUN = 10;
const ALERTABLE_TYPES = new Set(["즉시 관심 후보", "돌파 관심 후보"]);

type AlertLogRow = {
  stockCode?: string;
  alertType?: string;
  sentAt?: string;
};

async function alreadyAlertedToday(stockCode: string): Promise<boolean> {
  if (!hasGoogleSheetsConfig()) return false;
  try {
    const today = kstDateString();
    const logs = await getRows<AlertLogRow>("alert_logs");
    return logs.some(
      (log) =>
        log.stockCode === stockCode &&
        log.alertType === "new_recommendation" &&
        log.sentAt &&
        kstDateString(new Date(log.sentAt)) === today,
    );
  } catch {
    return false;
  }
}

async function logAlert(candidate: AlertCandidate) {
  if (!hasGoogleSheetsConfig()) return;
  try {
    await appendRow("alert_logs", {
      id: crypto.randomUUID(),
      stockCode: candidate.stockCode,
      stockName: candidate.stockName,
      alertType: candidate.alertType,
      message: candidate.message,
      currentPrice: candidate.currentPrice ?? "",
      targetPrice: candidate.targetPrice ?? "",
      profitRate: candidate.profitRate ?? "",
      channel: candidate.channel,
      sentAt: nowIso(),
    });
  } catch {
    // 로그 저장 실패는 무시한다.
  }
}

/**
 * 스캔 완료 후 새 추천 후보를 Telegram으로 알린다.
 * 동일 종목 동일 유형은 하루 1회만 발송한다.
 */
export async function dispatchScanAlerts(response: ScanRunResponse): Promise<{ sent: number; skipped: number }> {
  if (!hasTelegramConfig()) {
    return { sent: 0, skipped: 0 };
  }

  const targets = response.recommendations
    .filter((item) => ALERTABLE_TYPES.has(item.recommendationType))
    .slice(0, MAX_ALERTS_PER_RUN);

  let sent = 0;
  let skipped = 0;

  for (const item of targets) {
    if (await alreadyAlertedToday(item.stockCode)) {
      skipped += 1;
      continue;
    }

    const candidate: AlertCandidate = {
      stockCode: item.stockCode,
      stockName: item.stockName,
      alertType: "new_recommendation",
      message: `${item.recommendationType} · ${item.summary}`,
      currentPrice: item.currentPrice,
      targetPrice: item.targetPrice1,
      stopLossPrice: item.stopLossPrice,
      profitRate: null,
      channel: "telegram",
      severity: "normal",
    };

    const result = await sendAlertToTelegram(candidate);
    if (result.ok) {
      await logAlert(candidate);
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { sent, skipped };
}
