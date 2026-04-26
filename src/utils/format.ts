/**
 * Locale-aware number and date formatting helpers. Use these instead of
 * hard-coded `toLocaleString('en-US', …)` calls so Arabic, Chinese, etc.
 * format correctly.
 */
export function formatNumber(value: number, locale: string, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return String(value);
  }
}

export function formatDate(date: Date | number, locale: string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  try {
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return d.toDateString();
  }
}
