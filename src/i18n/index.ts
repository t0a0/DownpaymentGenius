import { de } from './de';
import { en, type DictKey } from './en';

export type Lang = 'en' | 'de';
export type { DictKey };

const DICTS: Record<Lang, Record<DictKey, string>> = { en, de };

export const hasKey = (lang: Lang, key: string): boolean => key in DICTS[lang];

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  const s = (DICTS[lang] as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export type T = (key: string, params?: Record<string, string | number>) => string;

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(locale: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = locale + JSON.stringify(opts);
  let f = nfCache.get(k);
  if (!f) {
    f = new Intl.NumberFormat(locale, opts);
    nfCache.set(k, f);
  }
  return f;
}

export const localeOf = (lang: Lang): string => (lang === 'de' ? 'de-DE' : 'en-US');

export interface Fmt {
  lang: Lang;
  /** € amount, no decimals */
  eur: (x: number, opts?: { sign?: boolean }) => string;
  /** € amount, compact (412k / 412 Tsd.) for axes */
  eurCompact: (x: number) => string;
  /** € compact with 4 significant digits (€2.231M) for axes with a narrow range */
  eurPrecise: (x: number) => string;
  /** € with cents */
  eur2: (x: number) => string;
  num: (x: number, digits?: number) => string;
  /** percent given in percent units (4.26 → 4.26 %) */
  pct: (x: number, digits?: number, sign?: boolean) => string;
  /** percent given as a decimal (0.0426 → 4.26 %) */
  pctDec: (x: number, digits?: number) => string;
  /** month label for a calendar (year, month 0-11) */
  month: (year: number, month: number) => string;
  /** months → "2y 4m" */
  duration: (months: number) => string;
  date: (d: Date) => string;
}

export function makeFmt(lang: Lang): Fmt {
  const loc = localeOf(lang);
  const eur0 = nf(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, minimumFractionDigits: 0 });
  const eurS = nf(loc, {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    signDisplay: 'exceptZero',
  });
  const eurC = nf(loc, { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 });
  const eurP = nf(loc, { style: 'currency', currency: 'EUR', notation: 'compact', maximumSignificantDigits: 4 });
  const eur2 = nf(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2, minimumFractionDigits: 2 });
  const monthFmt = new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric' });
  const dateFmt = new Intl.DateTimeFormat(loc, { dateStyle: 'medium' });
  const pctF = (d: number, sign = false) =>
    nf(loc, {
      style: 'percent',
      maximumFractionDigits: d,
      minimumFractionDigits: d,
      signDisplay: sign ? 'exceptZero' : 'auto',
    });
  return {
    lang,
    eur: (x, o) => (Number.isFinite(x) ? (o?.sign ? eurS : eur0).format(x) : '–'),
    eurCompact: (x) => (Number.isFinite(x) ? eurC.format(x) : '–'),
    eurPrecise: (x) => (Number.isFinite(x) ? eurP.format(x) : '–'),
    eur2: (x) => (Number.isFinite(x) ? eur2.format(x) : '–'),
    num: (x, d = 0) => nf(loc, { maximumFractionDigits: d, minimumFractionDigits: d }).format(x),
    pct: (x, d = 2, sign = false) => (Number.isFinite(x) ? pctF(d, sign).format(x / 100) : '–'),
    pctDec: (x, d = 2) => (Number.isFinite(x) ? pctF(d).format(x) : '–'),
    month: (y, m) => monthFmt.format(new Date(y, m, 1)),
    duration: (months) => {
      const m = Math.max(0, Math.round(months));
      const y = Math.floor(m / 12);
      const r = m % 12;
      if (lang === 'de') return [y ? `${y} J.` : '', r || !y ? `${r} M.` : ''].filter(Boolean).join(' ');
      return [y ? `${y}y` : '', r || !y ? `${r}m` : ''].filter(Boolean).join(' ');
    },
    date: (d) => dateFmt.format(d),
  };
}
