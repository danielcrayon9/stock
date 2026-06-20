// 한국 표준시(KST)는 UTC+9이며 일광절약시간을 사용하지 않는다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** UTC 필드가 KST 시각을 나타내는 Date 객체를 반환한다. */
function kstDate(base: Date = new Date()): Date {
  return new Date(base.getTime() + KST_OFFSET_MS);
}

export function kstDateString(base: Date = new Date()): string {
  return kstDate(base).toISOString().slice(0, 10);
}

export function kstParts(base: Date = new Date()) {
  const d = kstDate(base);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    weekday: d.getUTCDay(), // 0=일, 6=토
  };
}

export function isKstWeekend(base: Date = new Date()): boolean {
  const { weekday } = kstParts(base);
  return weekday === 0 || weekday === 6;
}

/** 장중 여부: KST 평일 09:00 ~ 15:30 */
export function isKstMarketOpen(base: Date = new Date()): boolean {
  if (isKstWeekend(base)) return false;
  const { hour, minute } = kstParts(base);
  const minutes = hour * 60 + minute;
  return minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
}
