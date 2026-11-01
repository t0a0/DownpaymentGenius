// UI metadata for every input: kind, unit, slider range and whether it shows in Basic mode.
// Keys are dotted paths into Inputs and double as help keys.

import type { Inputs } from '../engine';

export type Unit =
  | 'eur'
  | 'eurMonth'
  | 'eurYear'
  | 'eurM2Month'
  | 'pct'
  | 'pctYear'
  | 'pp'
  | 'ppYear'
  | 'years'
  | 'year'
  | 'age'
  | 'm2'
  | 'none';

interface FieldBase {
  key: string;
  advanced?: boolean;
  showIf?: (i: Inputs) => boolean;
  /** i18n key of the "history says" hint */
  hint?: string;
}

export interface NumberField extends FieldBase {
  kind: 'number';
  unit: Unit;
  min: number;
  max: number;
  step: number;
  /** slider range when narrower than the allowed range */
  sliderMin?: number;
  sliderMax?: number;
  /** digits shown in the number box */
  digits?: number;
}

export interface SelectField extends FieldBase {
  kind: 'select';
  options: { value: string | number; label: string }[] | 'cities' | 'states';
}

export interface ToggleField extends FieldBase {
  kind: 'toggle';
}

export interface ListField extends FieldBase {
  kind: 'years' | 'tiers' | 'fixAdj';
}

export type Field = NumberField | SelectField | ToggleField | ListField;

export type SectionId = 'you' | 'invest' | 'rent' | 'property' | 'mortgage' | 'sim';

const n = (
  key: string,
  unit: Unit,
  min: number,
  max: number,
  step: number,
  extra: Partial<NumberField> = {},
): NumberField => ({ kind: 'number', key, unit, min, max, step, ...extra });

const isApartment = (i: Inputs) => i.property.type === 'apartment';
const isHouse = (i: Inputs) => i.property.type === 'house';

export const SECTIONS: { id: SectionId; fields: Field[] }[] = [
  {
    id: 'you',
    fields: [
      n('you.capital', 'eur', 0, 5_000_000, 1_000, { sliderMax: 1_000_000 }),
      n('you.capitalGainPct', 'pct', 0, 95, 1, { advanced: true }),
      n('you.cash', 'eur', 0, 2_000_000, 500, { sliderMax: 200_000 }),
      n('you.cushion', 'eur', 0, 500_000, 500, { sliderMax: 50_000 }),
      n('you.monthlySavings', 'eurMonth', 0, 50_000, 50, { sliderMax: 8_000 }),
      n('you.savingsGrowth', 'pctYear', -10, 15, 0.1, { advanced: true, digits: 1 }),
      n('you.netIncome', 'eurMonth', 0, 100_000, 100, { sliderMax: 20_000 }),
      n('you.incomeGrowth', 'pctYear', -10, 15, 0.1, { advanced: true, digits: 1 }),
      n('you.birthYear', 'year', 1930, 2015, 1),
      {
        kind: 'select',
        key: 'you.household',
        options: [
          { value: 'single', label: 'opt.household.single' },
          { value: 'couple', label: 'opt.household.couple' },
        ],
      },
      { kind: 'toggle', key: 'you.churchTax' },
      { kind: 'toggle', key: 'you.firstTimeBuyer', advanced: true },
      { kind: 'years', key: 'you.childBirthYears', advanced: true },
    ],
  },
  {
    id: 'invest',
    fields: [
      n('invest.expectedReturn', 'pctYear', -5, 20, 0.1, { sliderMin: 0, sliderMax: 12, digits: 1, hint: 'hist.expectedReturn' }),
      {
        kind: 'select',
        key: 'invest.fundType',
        advanced: true,
        options: [
          { value: 'equity', label: 'opt.fund.equity' },
          { value: 'mixed', label: 'opt.fund.mixed' },
          { value: 'bond', label: 'opt.fund.bond' },
        ],
      },
      n('invest.cashRate', 'pctYear', 0, 10, 0.1, { advanced: true, digits: 1 }),
      n('invest.basiszins', 'pct', -1, 8, 0.05, { advanced: true, digits: 2, hint: 'hist.basiszins' }),
    ],
  },
  {
    id: 'rent',
    fields: [
      n('rent.coldRent', 'eurMonth', 0, 20_000, 10, { sliderMax: 5_000 }),
      n('rent.rentGrowth', 'pctYear', -3, 10, 0.1, { sliderMin: -1, sliderMax: 6, digits: 1, hint: 'hist.rentGrowth' }),
    ],
  },
  {
    id: 'property',
    fields: [
      {
        kind: 'select',
        key: 'property.type',
        options: [
          { value: 'apartment', label: 'opt.type.apartment' },
          { value: 'house', label: 'opt.type.house' },
        ],
      },
      { kind: 'select', key: 'property.city', options: 'cities' },
      { kind: 'select', key: 'property.state', options: 'states' },
      n('property.price', 'eur', 20_000, 10_000_000, 5_000, { sliderMin: 50_000, sliderMax: 2_000_000 }),
      n('property.area', 'm2', 15, 1_000, 1, { sliderMax: 300 }),
      n('property.priceGrowth', 'pctYear', -10, 15, 0.1, { sliderMin: -2, sliderMax: 7, digits: 1, hint: 'hist.priceGrowth' }),
      n('property.ageingDrag', 'pctYear', 0, 3, 0.05, { advanced: true, digits: 2 }),
      n('property.notaryPct', 'pct', 0, 5, 0.1, { advanced: true, digits: 1 }),
      { kind: 'toggle', key: 'property.noBroker' },
      n('property.brokerPct', 'pct', 0, 7.14, 0.01, {
        advanced: true,
        digits: 2,
        showIf: (i) => !i.property.noBroker,
      }),
      n('property.oneOffCosts', 'eur', 0, 1_000_000, 500, { advanced: true, sliderMax: 100_000 }),
      n('property.hausgeld', 'eurM2Month', 0, 10, 0.05, { advanced: true, digits: 2, showIf: isApartment }),
      n('property.maintenance', 'eurM2Month', 0, 10, 0.05, { advanced: true, digits: 2 }),
      n('property.insurance', 'eurYear', 0, 10_000, 50, { advanced: true, sliderMax: 3_000, showIf: isHouse }),
      n('property.grundsteuer', 'eurYear', 0, 20_000, 10, { advanced: true, sliderMax: 3_000 }),
      { kind: 'toggle', key: 'property.hessengeldExtension', advanced: true, showIf: (i) => i.property.state === 'HE' },
    ],
  },
  {
    id: 'mortgage',
    fields: [
      {
        kind: 'select',
        key: 'mortgage.fixationYears',
        options: [
          { value: 5, label: 'opt.fix.5' },
          { value: 10, label: 'opt.fix.10' },
          { value: 15, label: 'opt.fix.15' },
          { value: 20, label: 'opt.fix.20' },
        ],
      },
      { kind: 'tiers', key: 'mortgage.rateTiers', advanced: true, hint: 'hist.rateTiers' },
      { kind: 'fixAdj', key: 'mortgage.fixationAdj', advanced: true },
      n('mortgage.bwDiscount', 'pct', 0, 40, 1, { advanced: true }),
      n('mortgage.tilgung', 'pct', 1, 10, 0.1, { digits: 1 }),
      n('mortgage.sondertilgung', 'pctYear', 0, 5, 0.5, { advanced: true, digits: 1 }),
      n('mortgage.drift', 'ppYear', -1.5, 1.5, 0.05, { sliderMin: -1, sliderMax: 1, digits: 2, hint: 'hist.drift' }),
      n('mortgage.driftYears', 'years', 0, 40, 1, { advanced: true, sliderMax: 20 }),
      {
        kind: 'select',
        key: 'mortgage.followUpMode',
        advanced: true,
        options: [
          { value: 'auto', label: 'opt.followUp.auto' },
          { value: 'manual', label: 'opt.followUp.manual' },
        ],
      },
      n('mortgage.followUpRate', 'pct', 0.5, 15, 0.05, {
        advanced: true,
        digits: 2,
        sliderMax: 10,
        hint: 'hist.followUpRate',
        showIf: (i) => i.mortgage.followUpMode === 'manual',
      }),
      { kind: 'toggle', key: 'mortgage.financeFees', advanced: true },
      n('mortgage.maxPaymentShare', 'pct', 10, 80, 1, { advanced: true, sliderMin: 20, sliderMax: 60 }),
    ],
  },
  {
    id: 'sim',
    fields: [
      {
        kind: 'select',
        key: 'sim.horizonMode',
        options: [
          { value: 'year', label: 'opt.horizon.year' },
          { value: 'age', label: 'opt.horizon.age' },
        ],
      },
      n('sim.horizonYear', 'year', 2028, 2110, 1, { sliderMax: 2080, showIf: (i) => i.sim.horizonMode === 'year' }),
      n('sim.horizonAge', 'age', 20, 110, 1, { sliderMin: 40, sliderMax: 95, showIf: (i) => i.sim.horizonMode === 'age' }),
      n('sim.maxWait', 'years', 1, 40, 1, { sliderMax: 25 }),
      n('sim.cpi', 'pctYear', -2, 15, 0.1, { advanced: true, sliderMin: 0, sliderMax: 6, digits: 1, hint: 'hist.cpi' }),
      { kind: 'toggle', key: 'sim.real' },
      { kind: 'toggle', key: 'sim.liquidate' },
      n('sim.sellingCosts', 'pct', 0, 15, 0.5, { advanced: true, digits: 1, showIf: (i) => i.sim.liquidate }),
    ],
  },
];

export const ALL_FIELDS: Field[] = SECTIONS.flatMap((s) => s.fields);
export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(ALL_FIELDS.map((f) => [f.key, f]));

export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.');
  const o = obj as Record<string, unknown>;
  return { ...o, [head]: rest.length ? setPath(o[head], rest.join('.'), value) : value } as T;
}

export const KPI_KEYS = [
  'kpi.bestMoment',
  'kpi.downPayment',
  'kpi.ltv',
  'kpi.rate',
  'kpi.paymentShare',
  'kpi.totalInterest',
  'kpi.debtFree',
  'kpi.marginalRate',
  'kpi.netLostNow',
  'kpi.netLostLater',
  'kpi.netLostNever',
] as const;

export const CHART_KEYS = [
  'chart.netWorth',
  'chart.timing',
  'chart.heatmap',
  'chart.waste',
  'chart.breakeven',
  'chart.tornado',
  'chart.stress',
  'chart.scenarios',
  'chart.yearly',
] as const;
