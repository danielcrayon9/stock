# Korea Stock AI Analyst

KOSPI 200과 KOSDAQ 상위 후보군을 자동으로 스캔해 현재 매수 가능성이 높은 종목을 선별·추천하는 Next.js 기반 투자 판단 보조 시스템입니다. 사용자가 종목을 직접 입력하지 않아도 시스템이 유니버스를 구성하고 일괄 분석합니다. 실제 주문 기능은 없으며 자동매매 시스템이 아닙니다.

## 핵심 방식

- 사용자가 종목을 직접 입력하지 않습니다.
- 시스템이 KOSPI 200 / KOSDAQ 후보군을 자동으로 불러와 분석합니다.
- 룰 기반으로 빠르게 1차 점수화 후, 상위 후보만 공시·뉴스·실적·AI 분석을 수행합니다(비용/속도 최적화).
- 결과를 점수화하여 추천 유형별로 분류합니다: 즉시 관심 / 분할매수 / 눌림목 대기 / 돌파 관심 / 제외 후보.

## 주요 기능

- 시장 스캐너: KOSPI 200 / KOSDAQ 상위 100 / 둘 다 자동 스캔
- 스캔 필터: 목표수익률(3~100%), 최소 거래대금, 최소 시가총액, 리스크 성향
- 종목별 일/주/월/년봉, 거래대금, 추세, 지지/저항, 기술 지표 일괄 분석
- 보수적/중립적/공격적 매수가, 손절가, 1·2차 목표가, 손익비 계산
- OpenDART 공시/실적, Naver 뉴스 조회와 호재/악재/중립 분류
- 상위 후보만 OpenAI/Gemini AI 최종 판단(룰 기반 fallback)
- 추천 유형별 탭, 상세 보기, 관심종목/보유 후보 등록
- Telegram 알림(신규 추천 후보, 매수가 도달 등), Vercel Cron 자동 스캔
- 같은 날 같은 조건 스캔은 캐시 우선, 강제 재스캔 지원
- Google Sheets 기반 관심종목/보유종목 CRUD
- 모든 화면 하단 투자 책임 고지 표시

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
  recommendations/  # 추천 종목 페이지
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
  scanStore.ts          # 스캔 결과/추천 시트 조회 및 당일 캐시
  scanAlerts.ts         # 신규 추천 후보 Telegram 알림
  time.ts               # KST 변환/장중 판단
  aiJudge.ts
  alertService.ts
  dartService.ts
  entryPriceEngine.ts
  googleSheets.ts
  newsService.ts
  stockData.ts
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
- `GET /api/universe?type=KOSPI200|KOSDAQ150|KOSDAQ100|KOSPI200_KOSDAQ100|CUSTOM`
- `POST /api/universe/refresh`
- `POST /api/scanner/run` (body: target, targetProfitRate, minTradingValue, minMarketCap, riskProfile, forceRescan, maxAiCandidates)
- `GET /api/scanner/latest`
- `GET /api/scanner/results?scanRunId=`
- `GET /api/scanner/cron`
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

## 향후 개선 계획

- 공식 시세 API 연동
- 종목 마스터 자동 갱신
- 알림 조건별 세부 설정 UI
- 백테스트와 리포트 PDF 내보내기
- 사용자별 Google Sheets 분리
- AI 리포트 히스토리 검색

## 투자 책임 고지

본 서비스의 모든 분석은 투자 판단 보조용이며 매수·매도 추천이 아닙니다. 데이터는 지연되거나 누락될 수 있으며, 최종 투자 판단과 책임은 사용자에게 있습니다.
