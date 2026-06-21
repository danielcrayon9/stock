import type { KisTokenResult } from "@/lib/kisTypes";

type CachedToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: CachedToken | null = null;

const EXPIRY_BUFFER_MS = 60_000;

function envValue(key: string, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

export function isKisConfigured() {
  return Boolean(envValue("KIS_APP_KEY") && envValue("KIS_APP_SECRET"));
}

export function getKisBaseUrl() {
  const configured = envValue("KIS_BASE_URL");
  if (configured) return configured.replace(/\/$/, "");

  const mode = envValue("KIS_MODE", "real").toLowerCase();
  return mode === "paper" || mode === "vts"
    ? "https://openapivts.koreainvestment.com:29443"
    : "https://openapi.koreainvestment.com:9443";
}

export function getKisCredentials() {
  return {
    appKey: envValue("KIS_APP_KEY"),
    appSecret: envValue("KIS_APP_SECRET"),
  };
}

function tokenEndpoint() {
  const mode = envValue("KIS_MODE", "real").toLowerCase();
  const path = mode === "paper" || mode === "vts" ? "/oauth2/tokenP" : "/oauth2/tokenP";
  return `${getKisBaseUrl()}${path}`;
}

export function clearKisTokenCache() {
  cachedToken = null;
}

export async function getKisAccessToken(forceRefresh = false): Promise<KisTokenResult> {
  const { appKey, appSecret } = getKisCredentials();
  if (!appKey || !appSecret) {
    return { ok: false, message: "KIS API 환경변수가 설정되지 않았습니다." };
  }

  if (
    !forceRefresh &&
    cachedToken &&
    cachedToken.expiresAtMs - EXPIRY_BUFFER_MS > Date.now()
  ) {
    return {
      ok: true,
      accessToken: cachedToken.accessToken,
      expiresAt: new Date(cachedToken.expiresAtMs).toISOString(),
    };
  }

  try {
    const response = await fetch(tokenEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret,
      }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as
      | {
          access_token?: string;
          expires_in?: number | string;
          error_description?: string;
          message?: string;
        }
      | null;

    if (!response.ok || !payload?.access_token) {
      const message =
        payload?.error_description ??
        payload?.message ??
        `KIS 토큰 발급 실패 (HTTP ${response.status})`;
      return { ok: false, message };
    }

    const expiresInSeconds = Number(payload.expires_in ?? 86_400);
    const expiresAtMs = Date.now() + Math.max(expiresInSeconds, 60) * 1000;
    cachedToken = {
      accessToken: payload.access_token,
      expiresAtMs,
    };

    return {
      ok: true,
      accessToken: payload.access_token,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  } catch {
    return { ok: false, message: "KIS 토큰 발급 중 네트워크 오류가 발생했습니다." };
  }
}
