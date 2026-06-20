import { DISCLAIMER } from "@/lib/constants";
import { appendRow, hasGoogleSheetsConfig } from "@/lib/googleSheets";
import { nowIso } from "@/lib/utils";
import type {
  AiFinalOpinion,
  AiJudgePayload,
  AiJudgeResult,
  AiRiskLevel,
  EntryPriceResult,
  NewsItem,
} from "@/lib/types";

const FINAL_OPINIONS: AiFinalOpinion[] = ["매수 가능", "분할매수", "관망", "위험", "매수금지"];
const RISK_LEVELS: AiRiskLevel[] = ["낮음", "보통", "주의", "높음", "매우 높음"];

type OpenAiChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
};

function toNumberOrNull(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean).slice(0, 10);
}

function riskLevelFromScore(score: number | null): AiRiskLevel {
  if (score == null) return "주의";
  if (score >= 85) return "매우 높음";
  if (score >= 70) return "높음";
  if (score >= 50) return "주의";
  if (score >= 30) return "보통";
  return "낮음";
}

function clampConfidence(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function ensureOpinion(value: unknown, fallback: AiFinalOpinion): AiFinalOpinion {
  return FINAL_OPINIONS.includes(value as AiFinalOpinion) ? (value as AiFinalOpinion) : fallback;
}

function ensureRiskLevel(value: unknown, fallback: AiRiskLevel): AiRiskLevel {
  return RISK_LEVELS.includes(value as AiRiskLevel) ? (value as AiRiskLevel) : fallback;
}

function compactNews(items: NewsItem[], sentiment: NewsItem["sentiment"]) {
  return items
    .filter((item) => item.sentiment === sentiment)
    .slice(0, 5)
    .map((item) => `${item.title} (${item.source})`);
}

function fallbackOpinion(entryPrice: EntryPriceResult, riskScore: number | null): AiFinalOpinion {
  if (entryPrice.stopLossPrice == null) return "매수금지";
  if (entryPrice.riskRewardRatio == null || entryPrice.riskRewardRatio < 2) return "관망";
  if ((riskScore ?? 100) >= 70) return "위험";
  return entryPrice.finalOpinionBase;
}

export function createFallbackJudge(payload: AiJudgePayload, message: string): AiJudgeResult {
  const entry = payload.entryPrice;
  const riskScore = payload.score.riskScore;
  const positiveNews = payload.news ? compactNews(payload.news.items, "positive") : [];
  const negativeNews = payload.news ? compactNews(payload.news.items, "negative") : [];
  const positiveDisclosures =
    payload.disclosures?.items
      .filter((item) => item.sentiment === "positive")
      .slice(0, 5)
      .map((item) => item.reportName) ?? [];
  const negativeDisclosures =
    payload.disclosures?.items
      .filter((item) => item.sentiment === "negative")
      .slice(0, 5)
      .map((item) => item.reportName) ?? [];

  return {
    finalOpinion: fallbackOpinion(entry, riskScore),
    confidence: 55,
    riskLevel: riskLevelFromScore(riskScore),
    conservativeBuyPrice: entry.conservativeBuyPrice,
    neutralBuyPrice: entry.neutralBuyPrice,
    aggressiveBuyPrice: entry.aggressiveBuyPrice,
    stopLossPrice: entry.stopLossPrice,
    targetPrice1: entry.targetPrice1,
    targetPrice2: entry.targetPrice2,
    riskRewardRatio: entry.riskRewardRatio,
    positiveFactors: [
      ...positiveNews,
      ...positiveDisclosures,
      ...(payload.score.reasons ?? []).filter((reason) => !reason.includes("위험")).slice(0, 3),
    ].slice(0, 8),
    negativeFactors: [
      ...negativeNews,
      ...negativeDisclosures,
      ...(payload.score.reasons ?? []).filter((reason) => reason.includes("위험") || reason.includes("악재")).slice(0, 3),
    ].slice(0, 8),
    entryStrategy:
      entry.riskRewardRatio != null && entry.riskRewardRatio >= 2
        ? "룰 기반 매수가와 손절가를 기준으로 분할 접근 여부를 검토합니다."
        : "손익비 또는 손절가 조건이 충분하지 않아 관망을 우선합니다.",
    riskManagement:
      entry.stopLossPrice != null
        ? `손절 기준은 ${entry.stopLossPrice.toLocaleString("ko-KR")}원 부근으로 관리합니다.`
        : "손절가가 산출되지 않아 매수 가능 의견을 제공하지 않습니다.",
    summary: "AI 판단이 비활성화되었거나 실패해 룰 기반 판단을 표시합니다.",
    warningMessage: DISCLAIMER,
    source: "fallback",
    status: "fallback",
    message,
  };
}

function buildPrompt(payload: AiJudgePayload) {
  const data = {
    stockName: payload.stock.stockName,
    stockCode: payload.stock.stockCode,
    currentPrice: payload.currentPrice,
    targetProfitRate: payload.targetProfitRate,
    dailyAnalysis: payload.dailyAnalysis.trend.summary,
    weeklyAnalysis: payload.periodAnalysis?.weekly ?? "데이터 부족",
    monthlyAnalysis: payload.periodAnalysis?.monthly ?? "데이터 부족",
    yearlyAnalysis: payload.periodAnalysis?.yearly ?? "데이터 부족",
    technicalScore: payload.score.technicalScore,
    volumeScore: payload.score.volumeScore,
    newsScore: payload.news?.newsScore ?? null,
    disclosureScore: payload.disclosures?.disclosureScore ?? null,
    financialScore: payload.financials?.financialScore ?? null,
    riskScore: payload.score.riskScore,
    supportLevels: payload.supportResistance.supportLevels,
    resistanceLevels: payload.supportResistance.resistanceLevels,
    conservativeBuyPrice: payload.entryPrice.conservativeBuyPrice,
    neutralBuyPrice: payload.entryPrice.neutralBuyPrice,
    aggressiveBuyPrice: payload.entryPrice.aggressiveBuyPrice,
    stopLossPrice: payload.entryPrice.stopLossPrice,
    targetPrice1: payload.entryPrice.targetPrice1,
    targetPrice2: payload.entryPrice.targetPrice2,
    riskRewardRatio: payload.entryPrice.riskRewardRatio,
    recentPositiveNews: payload.news ? compactNews(payload.news.items, "positive") : [],
    recentNegativeNews: payload.news ? compactNews(payload.news.items, "negative") : [],
    positiveDisclosures:
      payload.disclosures?.items.filter((item) => item.sentiment === "positive").map((item) => item.reportName) ?? [],
    negativeDisclosures:
      payload.disclosures?.items.filter((item) => item.sentiment === "negative").map((item) => item.reportName) ?? [],
    financialSummary: payload.financials?.summary ?? "데이터 부족",
    riskFactors: payload.score.reasons,
    ruleBasedOpinion: payload.entryPrice.finalOpinionBase,
  };

  return `너는 한국 주식 분석 보조 AI다. 제공된 데이터만 사용하고 사실을 지어내지 마라.
확정적 매수 표현을 피하고, 리스크와 손절 기준을 반드시 설명하라.
손절가가 없으면 "매수 가능" 또는 "분할매수"를 내지 마라.
손익비가 2 미만이면 "매수 가능" 또는 "분할매수"를 내지 마라.
악재 공시가 강하면 "위험" 또는 "매수금지"를 우선 고려하라.

반드시 아래 JSON 스키마만 반환하라. markdown, 설명문, 코드블록은 금지한다.
{
  "finalOpinion": "매수 가능 | 분할매수 | 관망 | 위험 | 매수금지",
  "confidence": 0,
  "riskLevel": "낮음 | 보통 | 주의 | 높음 | 매우 높음",
  "conservativeBuyPrice": 0,
  "neutralBuyPrice": 0,
  "aggressiveBuyPrice": 0,
  "stopLossPrice": 0,
  "targetPrice1": 0,
  "targetPrice2": 0,
  "riskRewardRatio": 0,
  "positiveFactors": [],
  "negativeFactors": [],
  "entryStrategy": "",
  "riskManagement": "",
  "summary": "",
  "warningMessage": "${DISCLAIMER}"
}

분석 데이터:
${JSON.stringify(data)}`;
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw new Error("AI 응답에서 JSON 객체를 찾지 못했습니다.");
    return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
  }
}

function validateAiResult(value: Record<string, unknown>, fallback: AiJudgeResult, source: "openai" | "gemini"): AiJudgeResult {
  const finalOpinion = ensureOpinion(value.finalOpinion, fallback.finalOpinion);
  const riskLevel = ensureRiskLevel(value.riskLevel, fallback.riskLevel);
  const stopLossPrice = toNumberOrNull(value.stopLossPrice) ?? fallback.stopLossPrice;
  const riskRewardRatio = toNumberOrNull(value.riskRewardRatio) ?? fallback.riskRewardRatio;

  let guardedOpinion = finalOpinion;
  if (stopLossPrice == null && (guardedOpinion === "매수 가능" || guardedOpinion === "분할매수")) {
    guardedOpinion = "매수금지";
  }
  if (riskRewardRatio != null && riskRewardRatio < 2 && (guardedOpinion === "매수 가능" || guardedOpinion === "분할매수")) {
    guardedOpinion = "관망";
  }

  return {
    finalOpinion: guardedOpinion,
    confidence: clampConfidence(value.confidence),
    riskLevel,
    conservativeBuyPrice: toNumberOrNull(value.conservativeBuyPrice) ?? fallback.conservativeBuyPrice,
    neutralBuyPrice: toNumberOrNull(value.neutralBuyPrice) ?? fallback.neutralBuyPrice,
    aggressiveBuyPrice: toNumberOrNull(value.aggressiveBuyPrice) ?? fallback.aggressiveBuyPrice,
    stopLossPrice,
    targetPrice1: toNumberOrNull(value.targetPrice1) ?? fallback.targetPrice1,
    targetPrice2: toNumberOrNull(value.targetPrice2) ?? fallback.targetPrice2,
    riskRewardRatio,
    positiveFactors: toStringArray(value.positiveFactors),
    negativeFactors: toStringArray(value.negativeFactors),
    entryStrategy: String(value.entryStrategy ?? fallback.entryStrategy),
    riskManagement: String(value.riskManagement ?? fallback.riskManagement),
    summary: String(value.summary ?? fallback.summary),
    warningMessage: DISCLAIMER,
    source,
    status: "ready",
    message: source === "openai" ? "OpenAI API 판단 결과입니다." : "Gemini API 판단 결과입니다.",
  };
}

async function callOpenAi(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim();
  if (!apiKey || !model) {
    throw new Error("OpenAI API 키 또는 모델명이 설정되지 않았습니다.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You return strict JSON only for Korean stock analysis assistance." },
        { role: "user", content: prompt },
      ],
    }),
  });

  const payload = (await response.json()) as OpenAiChatResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI API 응답 오류 (${response.status})`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI 응답이 비어 있습니다.");
  return content;
}

async function callGemini(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim();
  if (!apiKey || !model) {
    throw new Error("Gemini API 키 또는 모델명이 설정되지 않았습니다.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      }),
    },
  );

  const payload = (await response.json()) as GeminiResponse;
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Gemini API 응답 오류 (${response.status})`);
  }

  const content = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Gemini 응답이 비어 있습니다.");
  return content;
}

async function callAiModel(prompt: string): Promise<{ content: string; source: "openai" | "gemini" }> {
  if (process.env.OPENAI_API_KEY?.trim() && process.env.OPENAI_MODEL?.trim()) {
    return { content: await callOpenAi(prompt), source: "openai" };
  }
  if (process.env.GEMINI_API_KEY?.trim() && process.env.GEMINI_MODEL?.trim()) {
    return { content: await callGemini(prompt), source: "gemini" };
  }
  throw new Error("OpenAI/Gemini API 키 또는 모델명이 설정되지 않았습니다.");
}

export async function saveAnalysisResult(payload: AiJudgePayload, result: AiJudgeResult) {
  if (!hasGoogleSheetsConfig()) return;

  try {
    await appendRow("analysis_results", {
      id: crypto.randomUUID(),
      stockCode: payload.stock.stockCode,
      stockName: payload.stock.stockName,
      currentPrice: payload.currentPrice ?? "",
      technicalScore: payload.score.technicalScore ?? "",
      volumeScore: payload.score.volumeScore ?? "",
      newsScore: payload.news?.newsScore ?? "",
      disclosureScore: payload.disclosures?.disclosureScore ?? "",
      financialScore: payload.financials?.financialScore ?? "",
      riskScore: payload.score.riskScore ?? "",
      conservativeBuyPrice: result.conservativeBuyPrice ?? "",
      neutralBuyPrice: result.neutralBuyPrice ?? "",
      aggressiveBuyPrice: result.aggressiveBuyPrice ?? "",
      stopLossPrice: result.stopLossPrice ?? "",
      targetPrice1: result.targetPrice1 ?? "",
      targetPrice2: result.targetPrice2 ?? "",
      riskRewardRatio: result.riskRewardRatio ?? "",
      riskLevel: result.riskLevel,
      finalOpinion: result.finalOpinion,
      summary: result.summary,
      analyzedAt: nowIso(),
    });
  } catch {
    // Analysis must remain available even when Google Sheets credentials are invalid or the sheet is unavailable.
  }
}

export async function judgeStockAnalysis(payload: AiJudgePayload): Promise<AiJudgeResult> {
  const fallback = createFallbackJudge(payload, "AI 판단 전 룰 기반 fallback 결과입니다.");

  try {
    const { content, source } = await callAiModel(buildPrompt(payload));
    const parsed = parseJsonObject(content);
    const result = validateAiResult(parsed, fallback, source);
    await saveAnalysisResult(payload, result);
    return result;
  } catch (error) {
    const result = createFallbackJudge(
      payload,
      error instanceof Error ? `AI 판단 fallback: ${error.message}` : "AI 판단 fallback이 실행되었습니다.",
    );
    await saveAnalysisResult(payload, result);
    return result;
  }
}
