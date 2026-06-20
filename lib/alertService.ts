import { appendRow, getRows, hasGoogleSheetsConfig } from "@/lib/googleSheets";
import { getDisclosures } from "@/lib/dartService";
import { sendAlertToTelegram } from "@/lib/telegram";
import { getOhlcv } from "@/lib/ohlcv";
import { getStockPrice } from "@/lib/stockData";
import { analyzeVolume } from "@/lib/volumeAnalysis";
import type { AlertCandidate, AlertLog, AlertSetting, AlertType } from "@/lib/types";

type PortfolioAlertRow = {
  stockCode: string;
  stockName: string;
  targetPrice: string | number;
  stopLossPrice: string | number;
  currentPrice: string | number;
  profitRate: string | number;
  isActive?: string | boolean;
};

type WatchlistAlertRow = {
  stockCode: string;
  stockName: string;
  market?: string;
  isActive?: string | boolean;
};

type AnalysisResultRow = {
  stockCode: string;
  conservativeBuyPrice?: string | number;
  neutralBuyPrice?: string | number;
  analyzedAt?: string;
};

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function isEnabled(value: unknown) {
  return value === true || value === "TRUE" || value === "true" || value === "" || value == null;
}

function getKstNow() {
  const now = new Date();
  const kst = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  return kst;
}

export function isKoreanMarketOpen(now = getKstNow()) {
  const day = now.getDay();
  if (day === 0 || day === 6) return false;

  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
}

function kstDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function latestAnalysisByStock(rows: AnalysisResultRow[]) {
  const map = new Map<string, AnalysisResultRow>();
  rows.forEach((row) => {
    const current = map.get(row.stockCode);
    if (!current || String(row.analyzedAt ?? "") > String(current.analyzedAt ?? "")) {
      map.set(row.stockCode, row);
    }
  });
  return map;
}

function hasDuplicateLog(logs: AlertLog[], candidate: AlertCandidate) {
  if (candidate.severity === "high") return false;
  const today = kstDateKey(new Date());
  return logs.some(
    (log) =>
      String(log.stockCode) === candidate.stockCode &&
      String(log.alertType) === candidate.alertType &&
      kstDateKey(String(log.sentAt)) === today,
  );
}

async function getSafeRows<T>(sheetName: string): Promise<T[]> {
  if (!hasGoogleSheetsConfig()) return [];
  try {
    return await getRows<T>(sheetName);
  } catch {
    return [];
  }
}

async function evaluatePortfolioAlerts(): Promise<AlertCandidate[]> {
  const portfolio = await getSafeRows<PortfolioAlertRow>("portfolio");
  const candidates: AlertCandidate[] = [];

  for (const row of portfolio) {
    if (!isEnabled(row.isActive)) continue;

    const currentPrice = toNumber(row.currentPrice);
    const targetPrice = toNumber(row.targetPrice);
    const stopLossPrice = toNumber(row.stopLossPrice);
    const profitRate = toNumber(row.profitRate);

    if (currentPrice != null && targetPrice != null && currentPrice >= targetPrice) {
      candidates.push({
        stockCode: row.stockCode,
        stockName: row.stockName,
        alertType: "target_profit",
        message: "보유종목이 목표수익률 기준 목표가에 도달했습니다.",
        currentPrice,
        targetPrice,
        stopLossPrice,
        profitRate,
        channel: "telegram",
      });
    }

    if (currentPrice != null && stopLossPrice != null && currentPrice <= stopLossPrice * 1.02) {
      candidates.push({
        stockCode: row.stockCode,
        stockName: row.stockName,
        alertType: "stop_loss",
        message:
          currentPrice <= stopLossPrice
            ? "보유종목이 손절가에 도달했습니다."
            : "보유종목이 손절가 2% 이내로 접근했습니다.",
        currentPrice,
        targetPrice,
        stopLossPrice,
        profitRate,
        channel: "telegram",
        severity: currentPrice <= stopLossPrice ? "high" : "normal",
      });
    }
  }

  return candidates;
}

async function evaluateWatchlistBuyPriceAlerts(): Promise<AlertCandidate[]> {
  const [watchlist, analysisRows] = await Promise.all([
    getSafeRows<WatchlistAlertRow>("watchlist"),
    getSafeRows<AnalysisResultRow>("analysis_results"),
  ]);
  const analysisMap = latestAnalysisByStock(analysisRows);
  const candidates: AlertCandidate[] = [];

  for (const row of watchlist) {
    if (!isEnabled(row.isActive)) continue;

    const analysis = analysisMap.get(row.stockCode);
    const conservative = toNumber(analysis?.conservativeBuyPrice);
    const neutral = toNumber(analysis?.neutralBuyPrice);
    const targetPrice = neutral ?? conservative;
    if (targetPrice == null) continue;

    const quote = await getStockPrice(row.stockCode, row.market as "KOSPI" | "KOSDAQ" | "KONEX" | "UNKNOWN" | undefined);
    const currentPrice = quote?.currentPrice ?? null;
    if (currentPrice != null && currentPrice <= targetPrice) {
      candidates.push({
        stockCode: row.stockCode,
        stockName: row.stockName,
        alertType: "watchlist_buy_price",
        message: "관심종목이 최근 분석 매수가 기준에 도달했습니다.",
        currentPrice,
        targetPrice,
        stopLossPrice: null,
        profitRate: null,
        channel: "telegram",
      });
    }
  }

  return candidates;
}

async function evaluateMarketDataAlerts(): Promise<AlertCandidate[]> {
  const watchlist = await getSafeRows<WatchlistAlertRow>("watchlist");
  const candidates: AlertCandidate[] = [];

  for (const row of watchlist.slice(0, 30)) {
    if (!isEnabled(row.isActive)) continue;

    const quote = await getStockPrice(row.stockCode, row.market as "KOSPI" | "KOSDAQ" | "KONEX" | "UNKNOWN" | undefined);
    if (quote?.changeRate != null && quote.changeRate <= -5) {
      candidates.push({
        stockCode: row.stockCode,
        stockName: row.stockName,
        alertType: "price_drop",
        message: "전일 대비 -5% 이상 급락했습니다.",
        currentPrice: quote.currentPrice,
        targetPrice: null,
        stopLossPrice: null,
        profitRate: quote.changeRate,
        channel: "telegram",
        severity: "high",
      });
    }

    const ohlcv = await getOhlcv(row.stockCode, "daily", row.market);
    const volume = analyzeVolume(ohlcv.points);
    const latest = ohlcv.points.at(-1);
    if (latest && volume.tradingValueRatio20 != null && volume.tradingValueRatio20 >= 2) {
      candidates.push({
        stockCode: row.stockCode,
        stockName: row.stockName,
        alertType: "trading_value_surge",
        message: `거래대금이 20일 평균 대비 ${volume.tradingValueRatio20.toFixed(2)}배로 급증했습니다.`,
        currentPrice: latest.close,
        targetPrice: null,
        stopLossPrice: null,
        profitRate: null,
        channel: "telegram",
      });
    }
  }

  return candidates;
}

async function evaluateDisclosureAlerts(): Promise<AlertCandidate[]> {
  const watchlist = await getSafeRows<WatchlistAlertRow>("watchlist");
  const candidates: AlertCandidate[] = [];

  for (const row of watchlist.slice(0, 30)) {
    if (!isEnabled(row.isActive)) continue;

    const result = await getDisclosures(row.stockCode, 30);
    const negative = result.items.find((item) => item.sentiment === "negative");
    if (negative) {
      candidates.push({
        stockCode: row.stockCode,
        stockName: row.stockName,
        alertType: "negative_disclosure",
        message: `악재 가능 공시 발견: ${negative.reportName}`,
        currentPrice: null,
        targetPrice: null,
        stopLossPrice: null,
        profitRate: null,
        channel: "telegram",
        severity: "high",
      });
    }
  }

  return candidates;
}

async function applySettings(candidates: AlertCandidate[]) {
  const settings = await getSafeRows<AlertSetting>("alert_settings");
  const disabled = new Set(
    settings
      .filter((setting) => !isEnabled(setting.enabled))
      .map((setting) => `${setting.stockCode || "*"}:${setting.type}`),
  );

  return candidates.filter(
    (candidate) =>
      !disabled.has(`${candidate.stockCode}:${candidate.alertType}`) &&
      !disabled.has(`*:${candidate.alertType}`),
  );
}

async function writeAlertLog(candidate: AlertCandidate) {
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
    sentAt: new Date().toISOString(),
  });
}

export async function runAlertCheck(options: { includeMarketClosed?: boolean } = {}) {
  const marketOpen = isKoreanMarketOpen();
  const logs = await getSafeRows<AlertLog>("alert_logs");

  const candidates = [
    ...(await evaluatePortfolioAlerts()),
    ...(marketOpen || options.includeMarketClosed ? await evaluateWatchlistBuyPriceAlerts() : []),
    ...(marketOpen || options.includeMarketClosed ? await evaluateMarketDataAlerts() : []),
    ...(await evaluateDisclosureAlerts()),
  ];
  const enabledCandidates = await applySettings(candidates);
  const deduped = enabledCandidates.filter((candidate) => !hasDuplicateLog(logs, candidate));

  const results = await Promise.all(
    deduped.map(async (candidate) => {
      const sent = await sendAlertToTelegram(candidate);
      if (sent.ok && hasGoogleSheetsConfig()) {
        await writeAlertLog(candidate);
      }
      return { candidate, sent };
    }),
  );

  return {
    marketOpen,
    checkedAt: new Date().toISOString(),
    candidates: enabledCandidates.length,
    skippedDuplicates: enabledCandidates.length - deduped.length,
    sent: results.filter((result) => result.sent.ok).length,
    results,
  };
}

export async function sendTestAlert() {
  const candidate: AlertCandidate = {
    stockCode: "TEST",
    stockName: "테스트",
    alertType: "target_profit",
    message: "Telegram 테스트 알림입니다.",
    currentPrice: null,
    targetPrice: null,
    stopLossPrice: null,
    profitRate: null,
    channel: "telegram",
  };
  return sendAlertToTelegram(candidate);
}

export function normalizeAlertType(value: string): AlertType {
  const allowed: AlertType[] = [
    "target_profit",
    "stop_loss",
    "watchlist_buy_price",
    "trading_value_surge",
    "negative_disclosure",
    "price_drop",
  ];
  return allowed.includes(value as AlertType) ? (value as AlertType) : "target_profit";
}
