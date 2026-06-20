import { getFinancialStatements } from "@/lib/dartService";
import type { DartFinancialRow } from "@/lib/dartService";
import type { FinancialMetric, FinancialResult } from "@/lib/types";

function parseAmount(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/,/g, "").replace(/[()]/g, "");
  const number = Number(normalized);
  if (!Number.isFinite(number)) return null;
  return value.includes("(") ? -number : number;
}

function findAmount(rows: DartFinancialRow[], names: string[]) {
  const row = rows.find((item) => names.some((name) => item.account_nm.includes(name)));
  return parseAmount(row?.thstrm_amount);
}

function metric(label: string, value: number | null, unit: string, source = "OpenDART 사업보고서"): FinancialMetric {
  return { label, value, unit, source };
}

const VALUATION_DATA_SOURCE = "주식수/현재가 연동 필요";

export function analyzeFinancialRows(rows: DartFinancialRow[], status: FinancialResult["status"], message: string): FinancialResult {
  if (status !== "ready" || rows.length === 0) {
    return {
      metrics: [
        metric("매출액", null, "억원"),
        metric("영업이익", null, "억원"),
        metric("순이익", null, "억원"),
        metric("영업이익률", null, "%"),
        metric("부채비율", null, "%"),
        metric("ROE", null, "%"),
        metric("EPS", null, "원", VALUATION_DATA_SOURCE),
        metric("PER", null, "배", VALUATION_DATA_SOURCE),
        metric("PBR", null, "배", VALUATION_DATA_SOURCE),
      ],
      status,
      message,
      financialScore: null,
      summary: "실적 데이터 부족",
    };
  }

  const revenue = findAmount(rows, ["매출액", "영업수익"]);
  const operatingProfit = findAmount(rows, ["영업이익"]);
  const netIncome = findAmount(rows, ["당기순이익", "분기순이익"]);
  const equity = findAmount(rows, ["자본총계"]);
  const liabilities = findAmount(rows, ["부채총계"]);
  const operatingMargin = revenue != null && revenue !== 0 && operatingProfit != null ? (operatingProfit / revenue) * 100 : null;
  const debtRatio = equity != null && equity !== 0 && liabilities != null ? (liabilities / equity) * 100 : null;
  const roe = equity != null && equity !== 0 && netIncome != null ? (netIncome / equity) * 100 : null;

  let score = 50;
  if (operatingProfit != null && operatingProfit > 0) score += 15;
  if (netIncome != null && netIncome > 0) score += 10;
  if (operatingMargin != null && operatingMargin >= 10) score += 10;
  if (debtRatio != null && debtRatio <= 100) score += 10;
  if (operatingProfit != null && operatingProfit < 0) score -= 20;
  if (netIncome != null && netIncome < 0) score -= 15;
  if (debtRatio != null && debtRatio >= 200) score -= 15;

  return {
    metrics: [
      metric("매출액", revenue, "억원"),
      metric("영업이익", operatingProfit, "억원"),
      metric("순이익", netIncome, "억원"),
      metric("영업이익률", operatingMargin, "%"),
      metric("부채비율", debtRatio, "%"),
      metric("ROE", roe, "%"),
      metric("EPS", null, "원", VALUATION_DATA_SOURCE),
      metric("PER", null, "배", VALUATION_DATA_SOURCE),
      metric("PBR", null, "배", VALUATION_DATA_SOURCE),
    ],
    status,
    message,
    financialScore: Math.max(0, Math.min(100, Math.round(score))),
    summary:
      operatingProfit == null
        ? "영업이익 데이터 부족"
        : operatingProfit >= 0
          ? "영업이익 흑자 기준으로 재무 점수를 계산했습니다."
          : "영업손실이 확인되어 재무 리스크를 반영했습니다.",
  };
}

export async function getFinancialAnalysis(stockCode: string): Promise<FinancialResult> {
  const result = await getFinancialStatements(stockCode);
  return analyzeFinancialRows(result.rows, result.status, result.message);
}
