export const DISCLAIMER =
  "본 분석은 투자 판단 보조용이며 매수·매도 추천이 아닙니다. 데이터는 지연되거나 누락될 수 있으며, 최종 투자 판단과 책임은 사용자에게 있습니다. 이 시스템은 자동매매 및 실제 주문 기능을 제공하지 않습니다.";

export const REQUIRED_ENV_KEYS = [
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "GOOGLE_SHEET_ID",
] as const;

export const OPTIONAL_ENV_KEYS = [
  "MARKET_DATA_PROVIDER",
  "USE_SAMPLE_MARKET_DATA",
  "OPENDART_API_KEY",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "CRON_SECRET",
  "BROKER_PROVIDER",
  "KIS_MODE",
  "ENABLE_ORDER",
  "READ_ONLY_MODE",
  "KIS_APP_KEY",
  "KIS_APP_SECRET",
  "KIS_BASE_URL",
  "KIS_ACCOUNT_NO",
  "KIS_APPROVAL_KEY",
  "KIWOOM_APP_KEY",
  "REALTIME_WORKER_URL",
  "WORKER_API_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
] as const;

export const SHEET_NAMES = [
  "watchlist",
  "portfolio",
  "news_cache",
  "disclosure_cache",
  "analysis_results",
  "alert_settings",
  "alert_logs",
  "universe_constituents",
  "scan_runs",
  "scan_results",
  "recommended_candidates",
] as const;

export const DEFAULT_TARGET_PROFIT_RATE = 20;
export const MIN_TARGET_PROFIT_RATE = 3;
export const MAX_TARGET_PROFIT_RATE = 100;

export const UNIVERSE_TYPES = [
  "KOSPI200",
  "KOSDAQ150",
  "KOSDAQ100",
  "KOSPI200_KOSDAQ100",
  "CUSTOM",
] as const;

export const UNIVERSE_LABELS: Record<(typeof UNIVERSE_TYPES)[number], string> = {
  KOSPI200: "KOSPI 200",
  KOSDAQ150: "KOSDAQ 150",
  KOSDAQ100: "KOSDAQ 상위 100",
  KOSPI200_KOSDAQ100: "KOSPI 200 + KOSDAQ 상위 100",
  CUSTOM: "커스텀 유니버스",
};

export const SCAN_TARGET_OPTIONS = [
  "KOSPI200",
  "KOSDAQ100",
  "KOSPI200_KOSDAQ100",
] as const;

export const RISK_PROFILES = ["conservative", "neutral", "aggressive"] as const;

export const RISK_PROFILE_LABELS: Record<(typeof RISK_PROFILES)[number], string> = {
  conservative: "보수적",
  neutral: "중립",
  aggressive: "공격적",
};

// 단위: 원
export const MIN_TRADING_VALUE_OPTIONS = [
  { label: "50억 이상", value: 5_000_000_000 },
  { label: "100억 이상", value: 10_000_000_000 },
  { label: "300억 이상", value: 30_000_000_000 },
  { label: "500억 이상", value: 50_000_000_000 },
] as const;

export const MIN_MARKET_CAP_OPTIONS = [
  { label: "제한 없음", value: 0 },
  { label: "1,000억 이상", value: 100_000_000_000 },
  { label: "3,000억 이상", value: 300_000_000_000 },
  { label: "5,000억 이상", value: 500_000_000_000 },
  { label: "1조 이상", value: 1_000_000_000_000 },
] as const;

export const RECOMMENDATION_TYPES = [
  "즉시 관심 후보",
  "분할매수 후보",
  "눌림목 대기 후보",
  "돌파 관심 후보",
  "제외 후보",
] as const;

export const SCORE_GRADES = [
  { min: 80, label: "강한 관심" },
  { min: 65, label: "관심" },
  { min: 50, label: "관망" },
  { min: 35, label: "주의" },
  { min: 0, label: "제외" },
] as const;

// 비용/속도 제약: 상위 후보만 AI 분석
export const MAX_AI_CANDIDATES = 30;
// 한 번의 스캔에서 룰 기반으로 분석할 최대 종목 수 (Vercel 타임아웃 대비)
export const MAX_SCAN_UNIVERSE = 220;
// 외부 시세 API 동시 호출 수
export const SCAN_BATCH_SIZE = 6;
