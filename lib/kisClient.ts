import {
  getKisAccessToken,
  getKisBaseUrl,
  getKisCredentials,
  isKisConfigured,
} from "@/lib/kisToken";
import type {
  KisCurrentPrice,
  KisHealthStatus,
  KisMarketIndex,
  KisOhlcvBar,
  KisOrderbookQuote,
  KisPeriod,
  KisRequestError,
  KisTokenResult,
} from "@/lib/kisTypes";
import { isReadOnlyMode, isTradingExecutionDisabled } from "@/lib/safetyGuard";
import { kstParts } from "@/lib/time";

const MAX_DAILY_BARS_PER_REQUEST = 100;
const MAX_DAILY_HISTORY_REQUESTS = 6;

type KisApiPayload = {
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
  output?: Record<string, string>;
  output1?: Record<string, string> | Record<string, string>[];
  output2?: Array<Record<string, string>>;
};

function parseNumber(value: string | number | undefined | null): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatKstCompactDate(base = new Date()) {
  const { year, month, day } = kstParts(base);
  return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
}

function formatKstHour(base = new Date()) {
  const { hour, minute } = kstParts(base);
  return `${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}00`;
}

function toKstIso(date: string, hour: string) {
  const normalizedHour = hour.padStart(6, "0");
  const isoDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  const hh = normalizedHour.slice(0, 2);
  const mm = normalizedHour.slice(2, 4);
  const ss = normalizedHour.slice(4, 6) || "00";
  return `${isoDate}T${hh}:${mm}:${ss}+09:00`;
}

function shiftCompactDate(date: string, days: number) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(4, 6)) - 1;
  const day = Number(date.slice(6, 8));
  const shifted = new Date(Date.UTC(year, month, day));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return `${shifted.getUTCFullYear()}${String(shifted.getUTCMonth() + 1).padStart(2, "0")}${String(shifted.getUTCDate()).padStart(2, "0")}`;
}

function indexDirection(change: number): "up" | "down" | "flat" {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

const INDEX_MAP: Record<string, { kisCode: string; marketDiv: "U" }> = {
  KOSPI: { kisCode: "0001", marketDiv: "U" },
  KOSDAQ: { kisCode: "1001", marketDiv: "U" },
  KOSPI200: { kisCode: "2001", marketDiv: "U" },
};

function periodToKisCode(period: KisPeriod) {
  if (period === "weekly") return "W";
  if (period === "monthly") return "M";
  if (period === "yearly") return "Y";
  return "D";
}

async function kisRequest(
  path: string,
  trId: string,
  params: Record<string, string>,
): Promise<{ ok: true; payload: KisApiPayload } | KisRequestError> {
  if (!isKisConfigured()) {
    return { ok: false, message: "KIS API 환경변수가 설정되지 않았습니다." };
  }

  const token = await getKisAccessToken();
  if (!token.ok) {
    return { ok: false, message: token.message };
  }

  const { appKey, appSecret } = getKisCredentials();
  const url = new URL(`${getKisBaseUrl()}/${path.replace(/^\//, "")}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        authorization: `Bearer ${token.accessToken}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: trId,
        custtype: "P",
      },
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as KisApiPayload | null;
    if (!response.ok || !payload) {
      return { ok: false, message: `KIS API 응답 오류 (HTTP ${response.status})` };
    }

    if (payload.rt_cd && payload.rt_cd !== "0") {
      return {
        ok: false,
        message: payload.msg1 ?? "KIS API 조회에 실패했습니다.",
        code: payload.msg_cd,
      };
    }

    return { ok: true, payload };
  } catch {
    return { ok: false, message: "KIS API 네트워크 오류가 발생했습니다." };
  }
}

function mapDailyBars(rows: Array<Record<string, string>>): KisOhlcvBar[] {
  return rows
    .map((row) => {
      const dateRaw = row.stck_bsop_date ?? row.bstp_nmix_prdy_clpr ?? row.stck_bsop_date;
      const open = parseNumber(row.stck_oprc ?? row.open);
      const high = parseNumber(row.stck_hgpr ?? row.high);
      const low = parseNumber(row.stck_lwpr ?? row.low);
      const close = parseNumber(row.stck_clpr ?? row.stck_prpr ?? row.close);
      const volume = parseNumber(row.acml_vol ?? row.cntg_vol ?? row.volume) ?? 0;
      if (!dateRaw || open == null || high == null || low == null || close == null) {
        return null;
      }

      const date =
        dateRaw.length === 8
          ? `${dateRaw.slice(0, 4)}-${dateRaw.slice(4, 6)}-${dateRaw.slice(6, 8)}`
          : dateRaw;

      return {
        date,
        open,
        high,
        low,
        close,
        volume,
        tradingValue: close * volume,
      };
    })
    .filter((item): item is KisOhlcvBar => item != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function mapIntradayBars(rows: Array<Record<string, string>>): KisOhlcvBar[] {
  return rows
    .map((row) => {
      const dateRaw = row.stck_bsop_date;
      const hourRaw = row.stck_cntg_hour;
      const open = parseNumber(row.stck_oprc);
      const high = parseNumber(row.stck_hgpr);
      const low = parseNumber(row.stck_lwpr);
      const close = parseNumber(row.stck_prpr);
      const volume = parseNumber(row.cntg_vol) ?? 0;
      if (!dateRaw || !hourRaw || open == null || high == null || low == null || close == null) {
        return null;
      }

      return {
        date: toKstIso(dateRaw, hourRaw),
        open,
        high,
        low,
        close,
        volume,
        tradingValue: close * volume,
      };
    })
    .filter((item): item is KisOhlcvBar => item != null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getAccessToken(): Promise<KisTokenResult> {
  return getKisAccessToken();
}

export async function getCurrentPrice(stockCode: string): Promise<KisCurrentPrice | null> {
  const result = await kisRequest("uapi/domestic-stock/v1/quotations/inquire-price", "FHKST01010100", {
    FID_COND_MRKT_DIV_CODE: "J",
    FID_INPUT_ISCD: stockCode,
  });

  if (!result.ok) return null;

  const output = result.payload.output;
  if (!output) return null;

  const currentPrice = parseNumber(output.stck_prpr);
  if (currentPrice == null) return null;

  const change = parseNumber(output.prdy_vrss) ?? 0;
  const changeRate = parseNumber(output.prdy_ctrt) ?? 0;
  const tradingVolume = parseNumber(output.acml_vol) ?? 0;
  const tradingValue = parseNumber(output.acml_tr_pbmn) ?? currentPrice * tradingVolume;

  return {
    stockCode,
    currentPrice,
    change,
    changeRate,
    tradingVolume,
    tradingValue,
    previousClose: parseNumber(output.stck_sdpr),
    open: parseNumber(output.stck_oprc),
    high: parseNumber(output.stck_hgpr),
    low: parseNumber(output.stck_lwpr),
    updatedAt: new Date().toISOString(),
    source: "KIS",
  };
}

export async function getDailyMinuteBars(
  stockCode: string,
  time?: string,
): Promise<{ bars: KisOhlcvBar[]; partial: boolean; message: string } | null> {
  const hour = time?.replace(/:/g, "").slice(0, 6).padEnd(6, "0") ?? formatKstHour();
  const result = await kisRequest(
    "uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice",
    "FHKST03010200",
    {
      FID_ETC_CLS_CODE: "",
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: stockCode,
      FID_INPUT_HOUR_1: hour,
      FID_PW_DATA_INCU_YN: "Y",
    },
  );

  if (!result.ok) return null;

  const rows = result.payload.output2 ?? [];
  const bars = mapIntradayBars(rows);
  if (bars.length === 0) return null;

  return {
    bars,
    partial: rows.length >= 120,
    message:
      rows.length >= 120
        ? "KIS 당일 분봉은 1회 조회당 제공 범위 내 데이터만 반환합니다."
        : "KIS 당일 분봉 데이터입니다.",
  };
}

export async function getPeriodPrice(
  stockCode: string,
  period: KisPeriod,
): Promise<{ bars: KisOhlcvBar[]; partial: boolean; message: string } | null> {
  const kisPeriod = periodToKisCode(period);
  const endDate = formatKstCompactDate();
  let cursorEnd = endDate;
  const collected: KisOhlcvBar[] = [];

  for (let attempt = 0; attempt < MAX_DAILY_HISTORY_REQUESTS; attempt += 1) {
    const cursorStart = shiftCompactDate(cursorEnd, -(MAX_DAILY_BARS_PER_REQUEST - 1));
    const result = await kisRequest(
      "uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice",
      "FHKST03010100",
      {
        FID_COND_MRKT_DIV_CODE: "J",
        FID_INPUT_ISCD: stockCode,
        FID_INPUT_DATE_1: cursorStart,
        FID_INPUT_DATE_2: cursorEnd,
        FID_PERIOD_DIV_CODE: kisPeriod,
        FID_ORG_ADJ_PRC: "0",
      },
    );

    if (!result.ok) break;

    const rows = result.payload.output2 ?? [];
    const mapped = mapDailyBars(rows);
    if (mapped.length === 0) break;

    collected.unshift(...mapped);
    if (rows.length < MAX_DAILY_BARS_PER_REQUEST) break;

    const oldest = mapped[0]?.date.replace(/-/g, "");
    if (!oldest) break;
    cursorEnd = shiftCompactDate(oldest, -1);
  }

  if (collected.length === 0) return null;

  const unique = Array.from(new Map(collected.map((bar) => [bar.date, bar])).values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    bars: unique,
    partial: unique.length >= MAX_DAILY_BARS_PER_REQUEST * MAX_DAILY_HISTORY_REQUESTS,
    message: `KIS ${period} 시세 ${unique.length}건`,
  };
}

export async function getOrderbook(stockCode: string): Promise<KisOrderbookQuote | null> {
  const result = await kisRequest(
    "uapi/domestic-stock/v1/quotations/inquire-asking-price-exp-ccn",
    "FHKST01010200",
    {
      FID_COND_MRKT_DIV_CODE: "J",
      FID_INPUT_ISCD: stockCode,
    },
  );

  if (!result.ok) return null;

  const output = result.payload.output1 ?? result.payload.output;
  if (!output || Array.isArray(output)) return null;

  const asks: Array<{ price: number; volume: number }> = [];
  const bids: Array<{ price: number; volume: number }> = [];

  for (let index = 1; index <= 10; index += 1) {
    const askPrice = parseNumber(output[`askp${index}`]);
    const askVolume = parseNumber(output[`askp_rsqn${index}`]);
    const bidPrice = parseNumber(output[`bidp${index}`]);
    const bidVolume = parseNumber(output[`bidp_rsqn${index}`]);

    if (askPrice != null && askVolume != null && askVolume > 0) {
      asks.push({ price: askPrice, volume: askVolume });
    }
    if (bidPrice != null && bidVolume != null && bidVolume > 0) {
      bids.push({ price: bidPrice, volume: bidVolume });
    }
  }

  if (asks.length === 0 && bids.length === 0) {
    return {
      stockCode,
      asks: [],
      bids: [],
      totalAskVolume: 0,
      totalBidVolume: 0,
      spread: null,
      orderbookAvailable: false,
      source: "KIS",
      updatedAt: new Date().toISOString(),
    };
  }

  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  const spread = bestAsk != null && bestBid != null ? bestAsk - bestBid : null;

  return {
    stockCode,
    asks: asks.slice(0, 5),
    bids: bids.slice(0, 5),
    totalAskVolume: asks.reduce((sum, item) => sum + item.volume, 0),
    totalBidVolume: bids.reduce((sum, item) => sum + item.volume, 0),
    spread,
    orderbookAvailable: true,
    source: "KIS",
    updatedAt: new Date().toISOString(),
  };
}

export async function getMarketIndex(indexCode: string): Promise<KisMarketIndex | null> {
  const mapped = INDEX_MAP[indexCode.toUpperCase()];
  if (!mapped) return null;

  const result = await kisRequest("uapi/domestic-stock/v1/quotations/inquire-index-price", "FHPUP02100000", {
    FID_COND_MRKT_DIV_CODE: mapped.marketDiv,
    FID_INPUT_ISCD: mapped.kisCode,
  });

  if (!result.ok) return null;

  const output = result.payload.output;
  if (!output) return null;

  const currentValue = parseNumber(output.bstp_nmix_prpr ?? output.stck_prpr);
  if (currentValue == null) return null;

  const change = parseNumber(output.bstp_nmix_prdy_vrss ?? output.prdy_vrss) ?? 0;
  const changeRate = parseNumber(output.bstp_nmix_prdy_ctrt ?? output.prdy_ctrt) ?? 0;

  return {
    indexCode: indexCode.toUpperCase(),
    currentValue,
    change,
    changeRate,
    direction: indexDirection(change),
    source: "KIS",
    updatedAt: new Date().toISOString(),
  };
}

export async function checkKisConnection(testStockCode = "005930"): Promise<KisHealthStatus> {
  const readOnlyMode = isReadOnlyMode();
  const orderEnabled = !isTradingExecutionDisabled();
  const configured = isKisConfigured();

  if (!configured) {
    return {
      kisConfigured: false,
      tokenAvailable: false,
      readOnlyMode,
      orderEnabled,
      orderApisImplemented: false,
      kisMode: process.env.KIS_MODE?.trim() || "real",
      message: "KIS_APP_KEY 또는 KIS_APP_SECRET이 설정되지 않았습니다.",
    };
  }

  const token = await getKisAccessToken();
  if (!token.ok) {
    return {
      kisConfigured: true,
      tokenAvailable: false,
      readOnlyMode,
      orderEnabled,
      orderApisImplemented: false,
      kisMode: process.env.KIS_MODE?.trim() || "real",
      message: token.message,
    };
  }

  const price = await getCurrentPrice(testStockCode);
  const priceOk = price != null;

  let message = "KIS 조회 API가 정상 설정되었습니다. 주문 기능은 구현되어 있지 않습니다.";
  if (!readOnlyMode || orderEnabled) {
    message = "KIS 토큰은 발급되었으나 READ_ONLY_MODE/ENABLE_ORDER 안전 설정을 확인하세요.";
  } else if (!priceOk) {
    message = "KIS 토큰은 발급되었으나 테스트 현재가 조회에 실패했습니다. 장 시간 또는 API 권한을 확인하세요.";
  }

  return {
    kisConfigured: true,
    tokenAvailable: true,
    readOnlyMode,
    orderEnabled,
    orderApisImplemented: false,
    kisMode: process.env.KIS_MODE?.trim() || "real",
    message,
  };
}
