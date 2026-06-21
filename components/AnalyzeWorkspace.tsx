"use client";

import { useCallback, useMemo, useState } from "react";
import AiReport from "@/components/AiReport";
import AnalysisSummary from "@/components/AnalysisSummary";
import BuyPriceCard from "@/components/BuyPriceCard";
import FundamentalInsights from "@/components/FundamentalInsights";
import RiskCard from "@/components/RiskCard";
import StockChart from "@/components/StockChart";
import StockSearch from "@/components/StockSearch";
import TargetProfitSlider from "@/components/TargetProfitSlider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { calculateEntryPrices } from "@/lib/entryPriceEngine";
import { formatKRW, formatPercent } from "@/lib/formatters";
import { scoreAnalysis } from "@/lib/scoringEngine";
import { findSupportResistance } from "@/lib/supportResistance";
import { analyzeTechnical } from "@/lib/technicalAnalysis";
import { kstDateString, kstParts } from "@/lib/time";
import type {
  AiJudgeResult,
  DisclosureResult,
  FinancialResult,
  NewsResult,
  OhlcvPeriod,
  OhlcvPoint,
  Stock,
  StockPriceQuote,
} from "@/lib/types";
import { analyzeVolume } from "@/lib/volumeAnalysis";

const PERIOD_LABELS: Record<OhlcvPeriod, string> = {
  daily: "일봉",
  weekly: "주봉",
  monthly: "월봉",
  yearly: "년봉",
  intraday: "당일 분봉",
};

function PriceDetail({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="text-sm font-bold text-slate-900">{formatKRW(value)}</span>
    </div>
  );
}

function isAfterMarketEndedToday(priceQuote: StockPriceQuote | null) {
  if (!priceQuote?.updatedAt || priceQuote.priceSession !== "장후") return false;
  const now = new Date();
  const { hour, minute } = kstParts(now);
  const minutes = hour * 60 + minute;
  return kstDateString(new Date(priceQuote.updatedAt)) === kstDateString(now) && minutes >= 18 * 60;
}

function priceToneClass(priceQuote: StockPriceQuote | null) {
  if (isAfterMarketEndedToday(priceQuote)) return "text-slate-950";
  if (priceQuote?.changeRate == null || priceQuote.changeRate === 0) return "text-slate-950";
  return priceQuote.changeRate > 0 ? "text-red-600" : "text-blue-600";
}

export default function AnalyzeWorkspace() {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [targetProfitRate, setTargetProfitRate] = useState(20);
  const [period, setPeriod] = useState<OhlcvPeriod>("daily");
  const [priceQuote, setPriceQuote] = useState<StockPriceQuote | null>(null);
  const [ohlcvPoints, setOhlcvPoints] = useState<OhlcvPoint[]>([]);
  const [chartStatusMessage, setChartStatusMessage] = useState("");
  const [chartErrorMessage, setChartErrorMessage] = useState("");
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [loadingChart, setLoadingChart] = useState(false);
  const [loadingFundamental, setLoadingFundamental] = useState(false);
  const [loadingAi, setLoadingAi] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const [disclosures, setDisclosures] = useState<DisclosureResult | null>(null);
  const [financials, setFinancials] = useState<FinancialResult | null>(null);
  const [news, setNews] = useState<NewsResult | null>(null);
  const [aiResult, setAiResult] = useState<AiJudgeResult | null>(null);

  const technical = useMemo(() => analyzeTechnical(ohlcvPoints, PERIOD_LABELS[period]), [ohlcvPoints, period]);
  const volume = useMemo(() => analyzeVolume(ohlcvPoints), [ohlcvPoints]);
  const supportResistance = useMemo(() => findSupportResistance(ohlcvPoints), [ohlcvPoints]);
  const currentPriceTone = priceToneClass(priceQuote);
  const baseScore = useMemo(
    () => scoreAnalysis(technical, volume, supportResistance),
    [technical, volume, supportResistance],
  );
  const score = useMemo(() => {
    if (baseScore.riskScore == null || !disclosures || disclosures.negativeCount === 0) return baseScore;
    return {
      ...baseScore,
      riskScore: Math.min(100, baseScore.riskScore + disclosures.negativeCount * 15),
      reasons: [...baseScore.reasons, "악재 공시가 확인되어 리스크 점수에 반영했습니다."].slice(0, 8),
    };
  }, [baseScore, disclosures]);
  const entryPriceResult = useMemo(
    () =>
      calculateEntryPrices({
        technical,
        supportResistance,
        volume,
        score,
        targetProfitRate,
      }),
    [technical, supportResistance, volume, score, targetProfitRate],
  );

  const loadMarketData = useCallback(async (stock: Stock, nextPeriod: OhlcvPeriod) => {
    setLoadingPrice(true);
    setLoadingChart(true);
    setChartErrorMessage("");
    setActionMessage("");

    try {
      const priceParams = new URLSearchParams({
        stockCode: stock.stockCode,
        market: stock.market,
      });
      const priceResponse = await fetch(`/api/stocks/price?${priceParams.toString()}`, {
        cache: "no-store",
      });
      const priceResult = await priceResponse.json();
      if (!priceResult.ok) throw new Error(priceResult.error);
      setPriceQuote(priceResult.data);

      const ohlcvParams = new URLSearchParams({
        stockCode: stock.stockCode,
        period: nextPeriod,
        market: stock.market,
      });
      const ohlcvResponse = await fetch(`/api/stocks/ohlcv?${ohlcvParams.toString()}`, {
        cache: "no-store",
      });
      const ohlcvResult = await ohlcvResponse.json();
      if (!ohlcvResult.ok) throw new Error(ohlcvResult.error);

      setOhlcvPoints(ohlcvResult.data.points ?? []);
      setAiResult(null);
      setChartStatusMessage(ohlcvResult.data.message ?? "");
      if (ohlcvResult.data.status === "data-unavailable") {
        setChartErrorMessage(ohlcvResult.data.message ?? "시세 데이터 연결 필요");
      }
    } catch (error) {
      setPriceQuote(null);
      setOhlcvPoints([]);
      setChartErrorMessage(error instanceof Error ? error.message : "시세 데이터를 불러오지 못했습니다.");
    } finally {
      setLoadingPrice(false);
      setLoadingChart(false);
    }
  }, []);

  const loadFundamentalData = useCallback(async (stock: Stock) => {
    setLoadingFundamental(true);
    setDisclosures(null);
    setFinancials(null);
    setNews(null);

    try {
      const [disclosureResponse, financialResponse, newsResponse] = await Promise.all([
        fetch(`/api/disclosures?stockCode=${encodeURIComponent(stock.stockCode)}&days=90`, { cache: "no-store" }),
        fetch(`/api/financials?stockCode=${encodeURIComponent(stock.stockCode)}`, { cache: "no-store" }),
        fetch(
          `/api/news?stockName=${encodeURIComponent(stock.stockName)}&stockCode=${encodeURIComponent(stock.stockCode)}&days=7`,
          { cache: "no-store" },
        ),
      ]);

      const [disclosureResult, financialResult, newsResult] = await Promise.all([
        disclosureResponse.json(),
        financialResponse.json(),
        newsResponse.json(),
      ]);

      setDisclosures(disclosureResult.ok ? disclosureResult.data : null);
      setFinancials(financialResult.ok ? financialResult.data : null);
      setNews(newsResult.ok ? newsResult.data : null);
    } catch {
      setDisclosures({
        items: [],
        status: "data-unavailable",
        message: "공시 데이터를 불러오지 못했습니다.",
        disclosureScore: null,
        positiveCount: 0,
        negativeCount: 0,
      });
      setFinancials({
        metrics: [],
        status: "data-unavailable",
        message: "실적 데이터를 불러오지 못했습니다.",
        financialScore: null,
        summary: "데이터 부족",
      });
      setNews({
        items: [],
        status: "data-unavailable",
        message: "뉴스 데이터를 불러오지 못했습니다.",
        newsScore: null,
        positiveCount: 0,
        negativeCount: 0,
      });
    } finally {
      setLoadingFundamental(false);
    }
  }, []);

  function handleSelectStock(stock: Stock) {
    setSelectedStock(stock);
    setPeriod("daily");
    setAiResult(null);
    void loadMarketData(stock, "daily");
    void loadFundamentalData(stock);
  }

  function handlePeriodChange(nextPeriod: OhlcvPeriod) {
    setPeriod(nextPeriod);
    if (selectedStock) {
      void loadMarketData(selectedStock, nextPeriod);
    }
  }

  async function handleAddWatchlist() {
    if (!selectedStock) {
      setActionMessage("먼저 종목을 선택해 주세요.");
      return;
    }

    setActionMessage("");
    try {
      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode: selectedStock.stockCode,
          stockName: selectedStock.stockName,
          market: selectedStock.market,
          targetProfitRate,
          memo: "종목 분석 화면에서 추가",
        }),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setActionMessage("관심종목에 저장했습니다.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "관심종목 저장에 실패했습니다.");
    }
  }

  async function handleAddPortfolio() {
    if (!selectedStock) {
      setActionMessage("먼저 종목을 선택해 주세요.");
      return;
    }

    const avgBuyPrice = priceQuote?.currentPrice;
    if (!avgBuyPrice) {
      setActionMessage("현재가가 없어 보유종목 등록을 진행할 수 없습니다.");
      return;
    }

    setActionMessage("");
    try {
      const response = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockCode: selectedStock.stockCode,
          stockName: selectedStock.stockName,
          buyDate: new Date().toISOString().slice(0, 10),
          avgBuyPrice,
          quantity: 1,
          targetProfitRate,
          stopLossRate: 7,
          currentPrice: avgBuyPrice,
          memo: "종목 분석 화면에서 등록",
        }),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setActionMessage("보유종목에 등록했습니다. 수량과 평균매수가는 보유종목 화면에서 수정할 수 있습니다.");
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "보유종목 등록에 실패했습니다.");
    }
  }

  async function handleRunAiJudge() {
    if (!selectedStock) {
      setActionMessage("먼저 종목을 선택해 주세요.");
      return;
    }

    setLoadingAi(true);
    setActionMessage("");

    try {
      const response = await fetch("/api/stocks/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: selectedStock,
          currentPrice: priceQuote?.currentPrice ?? technical.latest?.close ?? null,
          targetProfitRate,
          dailyAnalysis: technical,
          periodAnalysis: {
            [period]: technical.trend.summary,
          },
          score,
          supportResistance,
          entryPrice: entryPriceResult,
          disclosures,
          financials,
          news,
        }),
      });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error);
      setAiResult(result.data);
    } catch (error) {
      setActionMessage(error instanceof Error ? error.message : "AI 종합 판단에 실패했습니다.");
    } finally {
      setLoadingAi(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>종목 검색</CardTitle>
          <CardDescription>종목명 또는 6자리 종목코드로 국내주식을 검색합니다.</CardDescription>
        </CardHeader>
        <StockSearch selectedStock={selectedStock} onSelect={handleSelectStock} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{selectedStock ? `${selectedStock.stockName} (${selectedStock.stockCode})` : "차트"}</CardTitle>
            <CardDescription>
              {selectedStock
                ? `${selectedStock.market} · 목표수익률 ${targetProfitRate}% 기준 분석 화면`
                : "종목을 선택하면 OHLCV 차트가 표시됩니다."}
            </CardDescription>
          </CardHeader>
          <StockChart
            points={technical.points}
            period={period}
            onPeriodChange={handlePeriodChange}
            loading={loadingChart}
            errorMessage={selectedStock ? chartErrorMessage : ""}
            statusMessage={chartStatusMessage}
            supportLevel={supportResistance.primarySupport}
            resistanceLevel={supportResistance.primaryResistance}
          />
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>현재가</CardTitle>
              <CardDescription>
                {priceQuote?.status === "sample"
                  ? "개발용 샘플 시세"
                  : priceQuote?.status === "ready"
                    ? "실시간에 가까운 시세"
                    : "시세 연결 상태"}
              </CardDescription>
            </CardHeader>
            {!selectedStock ? (
              <p className="text-sm text-slate-500">종목을 선택하면 현재가가 표시됩니다.</p>
            ) : loadingPrice ? (
              <p className="text-sm text-slate-500">현재가를 불러오는 중입니다.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <p className={`text-3xl font-black ${currentPriceTone}`}>{formatKRW(priceQuote?.currentPrice)}</p>
                  {priceQuote?.priceSession && priceQuote.priceSession !== "데이터 부족" ? (
                    <span className="mb-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {priceQuote.priceSession} 반영
                    </span>
                  ) : null}
                </div>
                <p
                  className={`text-sm font-semibold ${
                    (priceQuote?.changeRate ?? 0) >= 0 ? "text-red-600" : "text-blue-600"
                  }`}
                >
                  {priceQuote?.changeAmount != null ? formatKRW(priceQuote.changeAmount) : "데이터 부족"}{" "}
                  {priceQuote?.changeRate != null ? (
                    <span className="inline-flex items-center gap-1">
                      {priceQuote.changeRate > 0 ? <span className="text-[0.55em] leading-none" style={{ fontSize: "0.55em" }}>▲</span> : null}
                      {priceQuote.changeRate < 0 ? <span className="text-[0.55em] leading-none" style={{ fontSize: "0.55em" }}>▼</span> : null}
                      <span>({formatPercent(priceQuote.changeRate)})</span>
                    </span>
                  ) : null}
                </p>
                <div className="grid gap-2 pt-1">
                  <PriceDetail label="정규장 가격" value={priceQuote?.regularMarketPrice} />
                  <PriceDetail label="장전 가격" value={priceQuote?.beforeMarketPrice} />
                  <PriceDetail label="장후 가격" value={priceQuote?.afterMarketPrice} />
                </div>
                <p className="text-xs text-slate-500">{priceQuote?.message ?? "시세 데이터 연결 필요"}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>목표수익률</CardTitle>
              <CardDescription>관심종목 저장 및 보유종목 등록 시 함께 반영됩니다.</CardDescription>
            </CardHeader>
            <TargetProfitSlider
              value={targetProfitRate}
              onChange={(value) => {
                setTargetProfitRate(value);
                setAiResult(null);
              }}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>저장</CardTitle>
              <CardDescription>선택한 종목을 관심종목 또는 보유종목으로 저장합니다.</CardDescription>
            </CardHeader>
            <div className="flex flex-col gap-2">
              <Button type="button" onClick={handleAddWatchlist} disabled={!selectedStock}>
                관심종목 저장
              </Button>
              <Button type="button" variant="outline" onClick={handleAddPortfolio} disabled={!selectedStock}>
                보유종목 등록
              </Button>
              {actionMessage ? <p className="text-sm text-slate-600">{actionMessage}</p> : null}
            </div>
          </Card>

          {selectedStock ? <RiskCard score={score} volume={volume} /> : null}
        </div>
      </div>

      {selectedStock ? (
        <>
          <AiReport result={aiResult} loading={loadingAi} onRun={handleRunAiJudge} />
          <BuyPriceCard result={entryPriceResult} />
          <FundamentalInsights
            disclosures={disclosures}
            financials={financials}
            news={news}
            loading={loadingFundamental}
          />
          <AnalysisSummary
            technical={technical}
            volume={volume}
            supportResistance={supportResistance}
            score={score}
          />
        </>
      ) : null}
    </div>
  );
}
