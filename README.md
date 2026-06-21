# Korea Stock AI Analyst

KOSPI 200과 KOSDAQ 상위 후보군을 자동으로 스캔해 현재 매수 가능성이 높은 종목을 선별·추천하는 Next.js 기반 투자 판단 보조 시스템입니다. 사용자가 종목을 직접 입력하지 않아도 시스템이 유니버스를 구성하고 일괄 분석합니다. 실제 주문 기능은 없으며 자동매매 시스템이 아닙니다.

## 핵심 방식

- 사용자가 종목을 직접 입력하지 않습니다.
- 시스템이 KOSPI 200 / KOSDAQ 후보군을 자동으로 불러와 분석합니다.
- 룰 기반으로 빠르게 1차 점수화 후, 상위 후보만 공시·뉴스·실적·AI 분석을 수행합니다(비용/속도 최적화).
- 결과를 점수화하여 추천 유형별로 분류합니다: 즉시 관심 / 분할매수 / 눌림목 대기 / 돌파 관심 / 제외 후보.

## 주요 기능

- 시장 스캐너: KOSPI 200 / KOSDAQ 상위 100 / 둘 다 자동 스캔
- 장중 스캐너 7단계: 종합 점수 가중 합산, 강제 제외, Top 10/AI 30 후보 추출
- 장중 스캐너 6단계: 당일 뉴스 시간·공시 교차·호재/악재 키워드 점수
- 장중 스캐너 5단계: KOSPI/KOSDAQ/업종 지수·breadth·시장 거래대금 추세 점수
- 장중 스캐너 4단계: 5/10호가 잔량, 상·하방 공백, 매도벽·스프레드·체결강도 점수
- 장중 스캐너 3단계: 전일 동시간 대비 거래대금, 15/30분 추세, 급증·윗꼬리·다이버전스 점수
- 장중 스캐너 2단계: 5분봉 VWAP·20MA·고점/저점 상승·돌파·거래량 유지·이탈 경고 분봉 흐름 점수
- 장중 스캐너 1단계: read-only 안전 상태, 장중 후보 UI, 분봉/호가/시장 지수/거래대금 지속성 표시 구조
- 스캔 필터: 목표수익률(3~100%), 최소 거래대금, 최소 시가총액, 리스크 성향
- 종목별 일/주/월/년봉, 거래대금, 추세, 지지/저항, 기술 지표 일괄 분석
- 보수적/중립적/공격적 매수가, 손절가, 1·2차 목표가, 손익비 계산
- 수수료·거래세·슬리피지 차감 후 순수익률, 순손익비, 손익분기 수익률 계산
- 최근 일봉 기반 백테스트(승률, 평균 순수익률, 최대낙폭, 목표/손절 도달률)
- OpenDART 공시/실적, Naver 뉴스 조회와 호재/악재/중립 분류
- 상위 후보만 OpenAI/Gemini AI 최종 판단(룰 기반 fallback)
- 추천 유형별 탭, 상세 보기, 관심종목/보유 후보 등록
- Telegram 알림(신규 추천 후보, 매수가 도달 등), Vercel Cron 자동 스캔
- 같은 날 같은 조건 스캔은 캐시 우선, 강제 재스캔 지원
- Google Sheets 기반 관심종목/보유종목 CRUD
- 모든 화면 하단 투자 책임 고지 표시
- 한국투자증권 실전투자 API Key 사용 시에도 조회 전용 모드만 지원
- 실제 주문 기능과 자동매매 기능 없음

## 기술 스택

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Recharts
- Google Sheets API
- OpenDART API
- Naver Search API
- OpenAI API / Gemini API
- Telegram Bot API
- Vercel Functions / Vercel Cron

## 폴더 구조

```text
app/
  scanner/          # 시장 스캐너 페이지
  intraday-scanner/ # 장중 스캐너 UI (2단계: 분봉 흐름 점수)
  recommendations/  # 추천 종목 페이지
    intraday/       # 장중 추천 후보 페이지
  analyze/
  alerts/
  dashboard/
  portfolio/
  settings/
  watchlist/
  api/
    scanner/        # run, latest, results, cron
    universe/       # 유니버스 조회/갱신
    recommendations/# latest, add-to-watchlist, add-to-portfolio-candidate
components/
  MarketScannerForm.tsx
  ScannerFilters.tsx
  ScanProgress.tsx
  RecommendationTable.tsx
  RecommendationCard.tsx
  ui/
config/
  markets.ts
  sheets.ts
lib/
  universeService.ts    # KOSPI200/KOSDAQ150/KOSDAQ100 유니버스 구성
  marketScanner.ts      # 스캔 오케스트레이션(분석→필터→enrich→AI→분류→저장)
  batchAnalyzer.ts      # 배치 룰 분석 + 1차 필터
  recommendationEngine.ts # 종합 점수/추천 유형/하드 제외 룰
  intradayScanner.ts   # 장중 스캐너 스냅샷 + 분봉 흐름 enrichment
  minuteBarBuilder.ts  # 1분봉→5분봉 집계, VWAP·20MA 계산
  minuteBarService.ts  # worker/샘플 분봉 조회
  sampleMinuteBars.ts  # worker 미연결 시 샘플 5분봉
  minuteFlowAnalysis.ts # 5분봉 흐름 점수 (VWAP/MA/고저점/돌파/거래량/이탈)
  volumePersistenceContext.ts # 전일 동시간 거래대금 컨텍스트 (worker/샘플)
  volumePersistence.ts # 거래대금 지속성 점수 (동시간·15/30분·윗꼬리)
  sampleOrderbook.ts   # worker 미연결 시 샘플 호가
  orderbookService.ts  # worker/샘플 호가 조회
  orderbookAnalysis.ts # 호가 공백·매도벽·스프레드·체결강도 점수
  sampleMarketIndexes.ts # worker 미연결 시 샘플 지수·breadth
  marketIndexService.ts  # worker/샘플 시장 지수 컨텍스트 조회
  marketIndexAnalysis.ts # KOSPI/KOSDAQ/업종·breadth 점수
  sampleTodayNews.ts     # worker/Naver 미연결 시 샘플 당일 뉴스
  todayNewsService.ts    # Naver·OpenDART·샘플 당일 뉴스 조회
  todayNewsAnalysis.ts   # 장중/재탕/공시·호재·악재 점수
  intradayDailyContext.ts # 일봉 기술·추세·손절/목표가
  intradayExclusion.ts   # 강제 제외 조건
  intradayTotalScore.ts  # 종합 점수·Top 후보 추출
  intradayAiJudge.ts   # 장중 AI JSON 응답 형식/fallback
  realtimeClient.ts    # realtime-worker 조회 전용 클라이언트
  safetyGuard.ts       # read-only 안전 가드
  tradingCost.ts        # 수수료/세금/슬리피지 비용 모델
  dailyBacktest.ts      # 일봉 기반 과거 재현 백테스트
  scanStore.ts          # 스캔 결과/추천 시트 조회 및 당일 캐시
  scanAlerts.ts         # 신규 추천 후보 Telegram 알림
  time.ts               # KST 변환/장중 판단
  aiJudge.ts
  alertService.ts
  dartService.ts
  entryPriceEngine.ts
  googleSheets.ts
  newsService.ts
  stockData.ts         # Yahoo/KIS 시세 + OHLCV provider
  kisToken.ts          # KIS OAuth 토큰 (메모리 캐시)
  kisClient.ts         # KIS 조회 전용 REST 클라이언트
  kisTypes.ts          # KIS 응답 타입
  technicalAnalysis.ts
  telegram.ts
```

## 설치

```bash
npm install
cp .env.example .env.local
npm run dev
```

브라우저에서 `http://localhost:3000`을 엽니다.

## 환경변수

필수:

- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `GOOGLE_SHEET_ID`

선택:

- `MARKET_DATA_PROVIDER`
- `USE_SAMPLE_MARKET_DATA`
- `BROKER_PROVIDER`
- `KIS_MODE`
- `ENABLE_ORDER`
- `READ_ONLY_MODE`
- `KIS_APP_KEY`
- `KIS_APP_SECRET`
- `KIS_BASE_URL` (기본: `https://openapi.koreainvestment.com:9443`)
- `KIS_ACCOUNT_NO` (이번 조회 단계에서는 사용하지 않음)
- `KIS_APPROVAL_KEY` (WebSocket 단계에서 사용, REST 조회에는 불필요)
- `KIWOOM_APP_KEY`
- `REALTIME_WORKER_URL`
- `WORKER_API_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `OPENDART_API_KEY`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

`.env.local`은 `.gitignore`에 포함되어 GitHub에 올라가지 않습니다. Vercel 배포 시에는 Project Settings → Environment Variables에 같은 값을 등록합니다.

## 실전투자 API 안전 정책

이 시스템은 자동매매 시스템이 아니며 실제 주문 기능을 제공하지 않습니다. 한국투자증권 실전투자 API Key를 사용하더라도 현재가, 분봉, 체결, 호가, 지수 조회 같은 조회 API만 사용하도록 설계합니다. 실제 계좌에 영향을 주는 것은 매수, 매도, 정정, 취소 같은 주문 API 호출이며, 본 프로젝트는 주문 API를 구현하지 않습니다.

필수 안전 기본값:

```bash
KIS_MODE=real
ENABLE_ORDER=false
READ_ONLY_MODE=true
```

`ENABLE_ORDER=true`로 설정하면 앱은 안전 가드에서 오류를 발생시키고 실행을 중단합니다. 이 프로젝트에서는 `ENABLE_ORDER=true` 상태를 지원하지 않습니다. API Key, App Secret, Approval Key, 계좌번호는 서버 환경변수에만 저장하고 브라우저, console.log, error log, UI 화면에 출력하지 않습니다.

주문 관련 경로/함수명이 코드에 없는지 간단히 확인하려면 다음을 실행하세요:

```bash
rg -n "/api/(order($|/)|buy($|/)|sell($|/)|trade($|/))|placeOrder|buyOrder|sellOrder|modifyOrder|cancelOrder|getOrderableCash|executeTrade|autoTrade" app lib components worker
```

이 명령은 안전 점검용입니다. `orderbook`처럼 호가 조회를 뜻하는 이름은 주문 기능이 아니며 조회 전용 API입니다.

## KIS 조회 API (REST, 조회 전용)

이 프로젝트는 **자동매매 시스템이 아닙니다**. 실전투자 API Key를 사용해도 **조회 API만** 호출하며, 매수·매도·정정·취소 주문 API는 구현하지 않습니다. 계좌번호(`KIS_ACCOUNT_NO`)는 이번 단계에서 사용하지 않습니다.

데이터 provider 우선순위:

1. KIS REST API (`KIS_APP_KEY` + `KIS_APP_SECRET` 설정 시)
2. 기존 Yahoo Finance / worker / sample fallback
3. 데이터 없음 표시

로컬 테스트 순서 (사용자가 `npm run dev` 실행 후):

```powershell
Invoke-RestMethod "http://localhost:3000/api/kis/health" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/stocks/price?stockCode=005930" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/stocks/ohlcv?stockCode=005930&period=daily" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/stocks/ohlcv?stockCode=005930&period=intraday" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/orderbook?stockCode=005930" | ConvertTo-Json -Depth 5
Invoke-RestMethod "http://localhost:3000/api/market/index?indexCode=KOSPI" | ConvertTo-Json -Depth 5
```

WebSocket 실시간 체결/호가와 `realtime-worker`는 다음 단계에서 `KIS_APPROVAL_KEY`와 함께 확장할 수 있습니다.

## Google Sheets 준비

1. Google Cloud에서 Service Account를 생성합니다.
2. Service Account JSON의 `client_email`, `private_key`를 `.env.local`에 입력합니다.
3. Google Spreadsheet를 만들고 Service Account 이메일에 편집 권한을 공유합니다.
4. Spreadsheet ID를 `GOOGLE_SHEET_ID`에 입력합니다.

필요한 시트는 앱이 헤더와 함께 자동 생성할 수 있습니다. 수동 생성 시 시트명은 다음과 같습니다:

- `watchlist`
- `portfolio`
- `news_cache`
- `disclosure_cache`
- `analysis_results`
- `alert_settings`
- `alert_logs`
- `universe_constituents`
- `scan_runs`
- `scan_results`
- `recommended_candidates`

## API 설정

OpenDART:

- `OPENDART_API_KEY`를 설정하면 공시와 가능한 실적 데이터를 조회합니다.
- 키가 없으면 해당 카드만 비활성화되고 앱은 정상 동작합니다.

Naver:

- `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 설정하면 뉴스 조회와 분류가 활성화됩니다.
- 키가 없으면 뉴스 분석만 비활성화됩니다.

OpenAI/Gemini:

- 기본 AI 판단은 `OPENAI_API_KEY`, `OPENAI_MODEL`을 사용합니다.
- OpenAI 값이 없고 `GEMINI_API_KEY`, `GEMINI_MODEL`이 있으면 Gemini를 시도합니다.
- AI 실패, JSON 파싱 실패, 필드 누락 시 룰 기반 fallback 결과를 표시합니다.

Telegram:

- BotFather에서 Bot Token을 만들고 `TELEGRAM_BOT_TOKEN`에 입력합니다.
- 본인 또는 그룹 채팅 ID를 `TELEGRAM_CHAT_ID`에 입력합니다.
- `/alerts`에서 테스트 알림을 발송할 수 있습니다.

## Vercel 배포

1. GitHub에 저장소를 push합니다.
2. Vercel에서 해당 저장소를 Import합니다.
3. Environment Variables에 `.env.example`의 값을 등록합니다.
4. Build Command는 기본값 `next build`를 사용합니다.
5. 배포 후 `/api/health`로 환경 상태를 확인합니다.

`vercel.json` Cron 구성:

- `/api/alerts/check` 15분마다 (KST 평일 09:00~15:30 장중 조건은 API 내부에서 판단)
- `/api/scanner/cron` 하루 3회 자동 스캔 (UTC 기준 23:00 / 03:30 / 06:10 → KST 08:00 장 시작 전 / 12:30 장중 / 15:10 장 마감 전후)

자동 스캔은 주말(KST)에는 실행되지 않습니다. `CRON_SECRET` 환경변수를 설정하면 `Authorization: Bearer <secret>` 헤더로 보호할 수 있습니다.

## 주요 API

- `GET /api/health`
- `GET /api/kis/health` (KIS 환경변수·토큰·조회 전용 안전 상태)
- `GET /api/universe?type=KOSPI200|KOSDAQ150|KOSDAQ100|KOSPI200_KOSDAQ100|CUSTOM`
- `POST /api/universe/refresh`
- `POST /api/scanner/run` (body: target, targetProfitRate, minTradingValue, minMarketCap, riskProfile, forceRescan, maxAiCandidates)
- `GET /api/scanner/latest`
- `GET /api/scanner/results?scanRunId=`
- `GET /api/scanner/cron`
- `GET /api/intraday/snapshot`
- `POST /api/intraday/scan` (7단계: 종합 점수 + 강제 제외 + Top 후보)
- `GET /api/intraday/score?target=`
- `GET /api/intraday/minute-flow?stockCode=`
- `GET /api/intraday/volume-persistence?stockCode=`
- `GET /api/intraday/orderbook-gap?stockCode=`
- `GET /api/intraday/market-index?stockCode=&market=KOSPI`
- `GET /api/intraday/today-news?stockCode=&stockName=`
- `GET /api/intraday/recommendations`
- `GET /api/market/index?indexCode=KOSPI` (`full=true` 전체 컨텍스트, `workerOnly=true` worker 전용)
- `GET /api/orderbook?stockCode=` (분석 포함, `workerOnly=true`로 worker 전용)
- `GET /api/minute-bars?stockCode=&interval=1m|3m|5m|15m`
- `POST /api/ai/intraday-judge`
- `GET /api/safety/status`
- `GET /api/recommendations/latest`
- `POST /api/recommendations/add-to-watchlist`
- `POST /api/recommendations/add-to-portfolio-candidate`
- `GET /api/watchlist`
- `POST /api/watchlist`
- `PUT /api/watchlist`
- `DELETE /api/watchlist`
- `GET /api/portfolio`
- `POST /api/portfolio`
- `PUT /api/portfolio`
- `DELETE /api/portfolio`
- `GET /api/stocks/search?query=`
- `GET /api/stocks/price?stockCode=&market=`
- `GET /api/stocks/ohlcv?stockCode=&period=daily|weekly|monthly|yearly&market=`
- `GET /api/disclosures?stockCode=&days=30|90|365`
- `GET /api/financials?stockCode=`
- `GET /api/news?stockName=&stockCode=&days=1|7|30`
- `POST /api/ai/judge`
- `POST /api/stocks/analyze`
- `GET /api/alerts`
- `POST /api/alerts`
- `PUT /api/alerts`
- `DELETE /api/alerts`
- `GET /api/alerts/check`

## 데이터 부족 처리

- API 키가 없으면 해당 기능만 비활성화합니다.
- 시세 API 실패 시 샘플 데이터로 자동 대체하지 않고 `시세 데이터 연결 필요`를 표시합니다.
- 실적 항목이 없으면 추정하지 않고 `데이터 부족`으로 표시합니다.
- AI 실패 시 룰 기반 결과를 표시합니다.
- Telegram 실패 시 발송 실패만 표시하고 앱은 유지됩니다.

## 검증

```bash
npm run lint
npm run build
npm run dev
```

체크리스트:

- `/scanner`에서 스캔 대상/필터 설정 후 스캔 실행
- 스캔 진행률 표시와 완료 후 추천 종목 리스트 확인
- `/recommendations`에서 추천 유형별 탭과 상세 보기 확인
- 추천 카드에서 관심종목/보유 후보 등록 확인
- `/dashboard` 최근 스캔 요약 확인
- `/analyze`에서 개별 종목 심화 분석 확인
- `/api/scanner/run`, `/api/scanner/latest`, `/api/universe?type=` 응답 확인
- API 키가 없어도 앱이 죽지 않는지 확인

## 알려진 한계

- 공식 구성종목 자동 갱신: `유니버스 갱신`(또는 `POST /api/universe/refresh`) 실행 시 KOSPI 200은 KRX → Naver Finance → 시드 순으로, KOSDAQ 150은 KRX → 시드 순으로 가져와 `universe_constituents` 시트에 캐싱합니다. KRX 데이터 포털은 봇 차단이 있어 환경에 따라 실패할 수 있으며, 이때 KOSPI 200은 Naver(공식 코스피200 200종목)로, KOSDAQ 150은 번들 시드로 폴백합니다. KOSDAQ 150 전체 공식 목록의 안정적 수급이 필요하면 KRX 유료/인증 연동 또는 시트 수동 입력을 사용하세요.
- 시가총액은 상장주식수 데이터 미연동으로 `데이터 부족`일 수 있으며, 이 경우 최소 시가총액 필터는 적용되지 않습니다.
- 관리종목/거래정지/투자경고·위험/감사의견 거절 등 KRX 플래그는 미연동이며, 악재 공시(횡령·배임, 대규모 유증/CB, 상폐 등)는 OpenDART 공시 분석으로 대체 점검합니다.
- 스캔 진행률은 추정치이며, 실시간 종목별 진행 표시는 SSE 연동 시 정확해집니다.
- Yahoo Finance chart API는 비공식 엔드포인트라 지연, 장애, 종목 누락 가능성이 있습니다.
- 전체 유니버스를 매 스캔마다 무거운 AI로 분석하지 않습니다(상위 후보만 AI).
- AI 판단은 제공 데이터 해석이며 확정적 투자 판단이 아닙니다.
- 일봉 백테스트는 장중 체결 순서를 알 수 없으므로 같은 날 목표가와 손절가가 모두 닿으면 보수적으로 손절 우선 처리합니다.
- 기본 비용 모델은 매수 수수료 0.015%, 매도 수수료 0.015%, 거래세 0.18%, 왕복 슬리피지 0.2% 가정입니다. 실제 증권사/종목/호가 상황과 다를 수 있습니다.

## 향후 개선 계획

- 공식 시세 API 연동
- 종목 마스터 자동 갱신
- 알림 조건별 세부 설정 UI
- 백테스트와 리포트 PDF 내보내기
- 사용자별 Google Sheets 분리
- AI 리포트 히스토리 검색

## 투자 책임 고지

본 서비스의 모든 분석은 투자 판단 보조용이며 매수·매도 추천이 아닙니다. 데이터는 지연되거나 누락될 수 있으며, 최종 투자 판단과 책임은 사용자에게 있습니다.
