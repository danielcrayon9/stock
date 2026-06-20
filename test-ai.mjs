const payload = {
  stock: { stockCode: "005930", stockName: "삼성전자", market: "KOSPI" },
  currentPrice: 71000,
  targetProfitRate: 20,
  dailyAnalysis: {
    points: [],
    latest: null,
    trend: { label: "일봉", trend: "상승", summary: "20일선 위 정배열, 단기 상승 흐름" },
    high52Week: 88000,
    low52Week: 60000,
    previousHigh: 75000,
    previousLow: 68000,
    signals: ["골든크로스 근접"],
    message: "ok",
  },
  periodAnalysis: { weekly: "주봉 상승", monthly: "월봉 중립", yearly: "년봉 중립" },
  score: { technicalScore: 72, volumeScore: 65, riskScore: 35, reasons: ["거래대금 양호", "20일선 지지"] },
  supportResistance: {
    supportLevels: [69000, 67000],
    resistanceLevels: [75000, 78000],
    primarySupport: 69000,
    primaryResistance: 75000,
    summary: "1차 지지 69000",
  },
  entryPrice: {
    conservativeBuyPrice: 69000,
    neutralBuyPrice: 70500,
    aggressiveBuyPrice: 72000,
    stopLossPrice: 66000,
    targetPrice1: 78000,
    targetPrice2: 85000,
    riskRewardRatio: 2.4,
    entrySuitability: "분할 접근",
    finalOpinionBase: "분할매수",
    scenarios: [],
    reasoning: ["손익비 양호"],
    warningMessage: "",
  },
  disclosures: null,
  financials: null,
  news: null,
};

const start = Date.now();
const res = await fetch("https://dc-stock.vercel.app/api/ai/judge", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const json = await res.json();
console.log("HTTP", res.status, `(${Date.now() - start}ms)`);
if (!json.ok) {
  console.log("ERROR:", json.error);
} else {
  const d = json.data;
  console.log("source     :", d.source);
  console.log("status     :", d.status);
  console.log("message    :", d.message);
  console.log("finalOpinion:", d.finalOpinion, "| confidence:", d.confidence, "| risk:", d.riskLevel);
  console.log("summary    :", d.summary);
  console.log("positive   :", JSON.stringify(d.positiveFactors));
  console.log("negative   :", JSON.stringify(d.negativeFactors));
}
