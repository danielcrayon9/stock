import { OPTIONAL_ENV_KEYS, REQUIRED_ENV_KEYS } from "@/lib/constants";
import type { EnvStatus } from "@/lib/types";

function getOptionalLabel(key: string) {
  if (["ENABLE_ORDER", "READ_ONLY_MODE", "KIS_MODE"].includes(key)) return "안전 · 조회 전용";
  if (key.startsWith("KIS_")) return "선택 · 한국투자증권 조회 API";
  if (key.startsWith("KIWOOM")) return "선택 · 키움 조회 API";
  if (key.startsWith("REALTIME") || key.startsWith("WORKER") || key.startsWith("UPSTASH")) return "선택 · 실시간 worker/캐시";
  if (key.startsWith("BROKER")) return "선택 · 증권사 선택";
  if (key.startsWith("OPENAI") || key.startsWith("GEMINI")) return "선택 · AI 판단";
  if (key.startsWith("NAVER")) return "선택 · 뉴스";
  if (key.startsWith("OPENDART")) return "선택 · 공시/실적";
  if (key.startsWith("TELEGRAM")) return "선택 · Telegram 알림";
  if (key.startsWith("CRON")) return "선택 · 자동 스캔 보호";
  return "선택 · 시세 데이터";
}

function StatusBadge({ configured, required }: { configured: boolean; required?: boolean }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-bold ${
        configured
          ? "bg-emerald-100 text-emerald-700"
          : required
            ? "bg-red-100 text-red-700"
            : "bg-slate-100 text-slate-500"
      }`}
    >
      {configured ? "설정됨" : required ? "필수 미설정" : "미설정"}
    </span>
  );
}

export default function SettingsForm({ envStatus }: { envStatus: EnvStatus[] }) {
  const statusByKey = new Map(envStatus.map((item) => [item.key, item.configured]));

  return (
    <div className="grid gap-2">
      {REQUIRED_ENV_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <code className="text-sm font-semibold text-slate-700">{key}</code>
            <p className="mt-1 text-xs text-slate-400">필수 · Google Sheets</p>
          </div>
          <StatusBadge configured={Boolean(statusByKey.get(key))} required />
        </div>
      ))}
      {OPTIONAL_ENV_KEYS.map((key) => (
        <div key={key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <code className="text-sm font-semibold text-slate-700">{key}</code>
            <p className="mt-1 text-xs text-slate-400">{getOptionalLabel(key)}</p>
          </div>
          <StatusBadge configured={Boolean(statusByKey.get(key))} />
        </div>
      ))}
    </div>
  );
}
