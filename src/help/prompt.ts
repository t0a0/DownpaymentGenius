import { STATE_NAMES, CITY_NAMES } from '../data/cities';
import { horizonYearOf, type Inputs, type SimContext } from '../engine';
import { makeFmt, translate, type Lang } from '../i18n';
import { FIELD_BY_KEY, getPath, type Unit } from '../state/fields';
import { HELP } from './registry';

const PCT_UNITS: Unit[] = ['pct', 'pctYear', 'pp', 'ppYear'];

/** Human-readable value of an input field in the UI language. */
export function formatFieldValue(key: string, inputs: Inputs, lang: Lang): string {
  const f = FIELD_BY_KEY[key];
  const v = getPath(inputs, key);
  const fmt = makeFmt(lang);
  const t = (k: string) => translate(lang, k);
  if (!f) return String(v);
  switch (f.kind) {
    case 'toggle':
      return t(v ? 'opt.on' : 'opt.off');
    case 'select': {
      if (f.options === 'cities') return CITY_NAMES[String(v)]?.[lang] ?? String(v);
      if (f.options === 'states') return STATE_NAMES[v as keyof typeof STATE_NAMES]?.[lang] ?? String(v);
      const o = f.options.find((x) => x.value === v);
      return o ? t(o.label) : String(v);
    }
    case 'years': {
      const arr = v as number[];
      return arr.length ? arr.join(', ') : t('children.none');
    }
    case 'tiers':
      return (v as number[]).map((x) => fmt.pct(x, 2)).join(' / ');
    case 'fixAdj':
      return (v as number[]).map((x) => fmt.pct(x, 2, true)).join(' / ');
    case 'number': {
      const x = v as number;
      const unit = t(`unit.${f.unit}`);
      if (f.unit === 'eur' || f.unit === 'eurMonth' || f.unit === 'eurYear') {
        return f.unit === 'eur' ? fmt.eur(x) : `${fmt.eur(x)} ${unit.replace('€', '').trim()}`.trim();
      }
      if (PCT_UNITS.includes(f.unit)) {
        const s = fmt.num(x, f.digits ?? 2);
        return f.unit === 'pct' ? fmt.pct(x, f.digits ?? 2) : `${s} ${unit}`;
      }
      if (f.unit === 'year') return String(x);
      return `${fmt.num(x, f.digits ?? 0)} ${unit}`.trim();
    }
  }
}

export interface PromptContext {
  /** current value text, e.g. for KPIs (fields are read from inputs) */
  value?: string;
  down?: number | null;
  loan?: number | null;
  /** effective rate, decimal */
  rate?: number | null;
  currentYear?: number;
  ctx?: SimContext;
}

/** Ready-made prompt for an AI chat, in the UI language. The context is the user's own inputs (clipboard only). */
export function buildHelpPrompt(key: string, inputs: Inputs, lang: Lang, pc: PromptContext = {}): string {
  const fmt = makeFmt(lang);
  const entry = HELP[key];
  const na = translate(lang, 'prompt.na');
  const year = pc.currentYear ?? new Date().getFullYear();
  const ctx = pc.ctx ?? { startYear: year, startMonth: 0 };
  const value = pc.value ?? (FIELD_BY_KEY[key] ? formatFieldValue(key, inputs, lang) : na);
  const money = (x: number | null | undefined) => (x === null || x === undefined ? na : fmt.eur(x));
  const body = translate(lang, 'prompt.template', {
    term: translate(lang, `help.${key}.title`),
    germanTerm: entry?.germanTerm ?? na,
    currentYear: year,
    value,
    price: fmt.eur(inputs.property.price),
    state: STATE_NAMES[inputs.property.state][lang],
    down: money(pc.down),
    loan: money(pc.loan),
    rate: pc.rate === null || pc.rate === undefined ? na : fmt.pctDec(pc.rate, 2),
    year: horizonYearOf(inputs, ctx),
  });
  const extra = entry?.extra[lang] ?? [];
  return extra.length ? `${body}\n\n${translate(lang, 'prompt.also')}\n${extra.map((q) => `- ${q}`).join('\n')}` : body;
}
