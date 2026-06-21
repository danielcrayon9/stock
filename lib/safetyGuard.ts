export const READ_ONLY_DISCLAIMER =
  "본 분석은 투자 판단 보조용이며 매수·매도 추천이 아닙니다. 데이터는 지연되거나 누락될 수 있으며, 최종 투자 판단과 책임은 사용자에게 있습니다. 이 시스템은 자동매매 및 실제 주문 기능을 제공하지 않습니다.";

function envValue(key: string, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

export function isReadOnlyMode() {
  return envValue("READ_ONLY_MODE", "true").toLowerCase() === "true";
}

export function isTradingExecutionDisabled() {
  return envValue("ENABLE_ORDER", "false").toLowerCase() === "false";
}

export function getSafetyStatus() {
  const readOnlyMode = isReadOnlyMode();
  const executionDisabled = isTradingExecutionDisabled();
  const kisMode = envValue("KIS_MODE", "real");
  const brokerProvider = envValue("BROKER_PROVIDER", "");
  const realtimeWorkerConfigured = Boolean(envValue("REALTIME_WORKER_URL"));
  const kisConfigured = Boolean(envValue("KIS_APP_KEY") && envValue("KIS_APP_SECRET"));
  const issues: string[] = [];

  if (!readOnlyMode) issues.push("READ_ONLY_MODE는 true여야 합니다.");
  if (!executionDisabled) issues.push("ENABLE_ORDER는 false여야 합니다. 이 프로젝트는 실제 주문 기능을 지원하지 않습니다.");

  return {
    ok: readOnlyMode && executionDisabled,
    readOnlyMode,
    executionDisabled,
    kisMode,
    brokerProvider,
    realtimeWorkerConfigured,
    kisConfigured,
    accountLookupDefaultEnabled: false,
    blockedCapabilities: ["실제 계좌 변경", "자동매매", "매수/매도 실행", "정정/취소 실행"],
    message:
      readOnlyMode && executionDisabled
        ? "조회, 분석, 추천, 알림 전용 read-only 모드입니다. 실제 주문은 실행되지 않습니다."
        : issues.join(" "),
    disclaimer: READ_ONLY_DISCLAIMER,
  };
}

export function assertReadOnlySafety() {
  const status = getSafetyStatus();
  if (!status.ok) {
    throw new Error(status.message);
  }
}
