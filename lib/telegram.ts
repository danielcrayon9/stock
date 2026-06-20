import type { AlertCandidate } from "@/lib/types";

function getTelegramConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  return token && chatId ? { token, chatId } : null;
}

function formatValue(value: number | null, suffix = "원") {
  if (value == null || !Number.isFinite(value)) return "데이터 부족";
  return `${Math.round(value).toLocaleString("ko-KR")}${suffix}`;
}

export function hasTelegramConfig() {
  return Boolean(getTelegramConfig());
}

export function buildTelegramMessage(candidate: AlertCandidate) {
  return [
    "[주식 알림]",
    `종목명: ${candidate.stockName}`,
    `종목코드: ${candidate.stockCode}`,
    `알림 유형: ${candidate.alertType}`,
    `현재가: ${formatValue(candidate.currentPrice)}`,
    `목표가: ${formatValue(candidate.targetPrice)}`,
    `손절가: ${formatValue(candidate.stopLossPrice)}`,
    `현재 수익률: ${formatValue(candidate.profitRate, "%")}`,
    `메시지: ${candidate.message}`,
    `시간: ${new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}`,
  ].join("\n");
}

export async function sendTelegramMessage(text: string) {
  const config = getTelegramConfig();
  if (!config) {
    return { ok: false as const, error: "Telegram 환경변수가 설정되지 않았습니다." };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        disable_web_page_preview: true,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      return { ok: false as const, error: payload?.description ?? `Telegram 응답 오류 (${response.status})` };
    }
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Telegram 발송 실패" };
  }
}

export async function sendAlertToTelegram(candidate: AlertCandidate) {
  return sendTelegramMessage(buildTelegramMessage(candidate));
}
