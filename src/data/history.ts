// Curated German market history. Lean on purpose: each stat carries its source and as-of date, and feeds slider
// ranges, scenario presets, "history says" hints, the tornado ranges and the refinancing stress test.
// Values are rounded long-run summaries compiled in Nov 2026; check the sources before relying on a single number.

import type { KnobRanges, ScenarioDef } from '../engine';

export interface Source {
  name: string;
  url: string;
}

export const SOURCES = {
  bbkRates: {
    name: 'Deutsche Bundesbank, MFI interest rate statistics, housing loans to households, initial fixation > 10 years, effective rate, new business (SUD119, BBIM1.M.DE.B.A2C.P.R.A.2250.EUR.N); before 2003: mortgage loans on residential property, fixed 10 years',
    url: 'https://www.bundesbank.de/de/statistiken/geld-und-kapitalmaerkte/zinssaetze-und-renditen/wohnungsbaukredite-an-private-haushalte-hypothekarkredite-auf-wohngrundstuecke-615036',
  },
  capitalo: {
    name: 'Capitalo, Bauzinsen by Beleihungsauslauf (loan ÷ purchase price) and Zinsbindung, 11 and 18 Sep 2026',
    url: 'https://www.capitalo.de/baufinanzierung/bauzinsen',
  },
  destatisHpi: {
    name: 'Destatis, House price index (Häuserpreisindex), table 61262',
    url: 'https://www-genesis.destatis.de/genesis/online?operation=table&code=61262-0001',
  },
  bbkProperty: {
    name: 'Deutsche Bundesbank / bulwiengesa, residential property prices in Germany (long series from 1975)',
    url: 'https://www.bundesbank.de/de/statistiken/indikatorensaetze/indikatorensatz-zur-wohnimmobilienmarkt-795290',
  },
  greix: {
    name: 'GREIX German Real Estate Index (Kiel Institute, Gutachterausschüsse)',
    url: 'https://greix.de',
  },
  destatisRent: {
    name: 'Destatis, consumer price index, net cold rents (Nettokaltmiete) sub-index, table 61111',
    url: 'https://www-genesis.destatis.de/genesis/online?operation=table&code=61111-0006',
  },
  destatisCpi: {
    name: 'Destatis, consumer price index (VPI), table 61111',
    url: 'https://www-genesis.destatis.de/genesis/online?operation=table&code=61111-0001',
  },
  msci: {
    name: 'MSCI World Index (net total return, EUR), annual performance',
    url: 'https://www.msci.com/indexes/index/990100',
  },
  bmfBasiszins: {
    name: 'BMF letter of 13 Jan 2026: Basiszins for the Vorabpauschale 2026 = 3.20 %',
    url: 'https://www.bundesfinanzministerium.de',
  },
  hessengeld: {
    name: 'Hessisches Ministerium der Finanzen, Hessengeld FAQ (Aug 2025)',
    url: 'https://finanzen.hessen.de/hessengeld',
  },
  grest: {
    name: 'Grunderwerbsteuer rates of the 16 states (state laws; HB 5.5 % since 07/2025)',
    url: 'https://de.wikipedia.org/wiki/Grunderwerbsteuer_(Deutschland)',
  },
} satisfies Record<string, Source>;

export type SourceId = keyof typeof SOURCES;

export interface Stat {
  id: string;
  value: number;
  unit: '%' | '%/yr' | 'pp' | '€/m²';
  source: SourceId;
  asOf: string;
}

export const STATS: Record<string, Stat> = {
  mortgageLow: { id: 'mortgageLow', value: 1.1, unit: '%', source: 'bbkRates', asOf: 'Dec 2020' },
  mortgageHigh2003: { id: 'mortgageHigh2003', value: 5.4, unit: '%', source: 'bbkRates', asOf: 'mid 2008' },
  mortgageHighAll: { id: 'mortgageHighAll', value: 10.8, unit: '%', source: 'bbkRates', asOf: '1981' },
  mortgageAvg2003: { id: 'mortgageAvg2003', value: 3.2, unit: '%', source: 'bbkRates', asOf: '2003–2025' },
  mortgageAvg1980: { id: 'mortgageAvg1980', value: 5.6, unit: '%', source: 'bbkRates', asOf: '1980–2025' },
  mortgageJump2y: { id: 'mortgageJump2y', value: 2.8, unit: 'pp', source: 'bbkRates', asOf: 'Dec 2021 → Oct 2023' },
  priceLongRun: { id: 'priceLongRun', value: 2.7, unit: '%/yr', source: 'bbkProperty', asOf: '1975–2025' },
  priceFlat: { id: 'priceFlat', value: 0.2, unit: '%/yr', source: 'bbkProperty', asOf: '1995–2009' },
  priceBoom: { id: 'priceBoom', value: 6.0, unit: '%/yr', source: 'destatisHpi', asOf: '2010–2021' },
  priceDrop: { id: 'priceDrop', value: -12, unit: '%', source: 'destatisHpi', asOf: 'Q2 2022 → Q4 2023 (GREIX: ≈ −15 %)' },
  rentLongRun: { id: 'rentLongRun', value: 1.4, unit: '%/yr', source: 'destatisRent', asOf: '1995–2025' },
  rentRecent: { id: 'rentRecent', value: 2.1, unit: '%/yr', source: 'destatisRent', asOf: '2024' },
  cpiLongRun: { id: 'cpiLongRun', value: 1.6, unit: '%/yr', source: 'destatisCpi', asOf: '1995–2025' },
  cpiPeak: { id: 'cpiPeak', value: 6.9, unit: '%/yr', source: 'destatisCpi', asOf: '2022' },
  equityLongRun: { id: 'equityLongRun', value: 7.5, unit: '%/yr', source: 'msci', asOf: '1980–2025, EUR' },
  equity2000: { id: 'equity2000', value: 6.0, unit: '%/yr', source: 'msci', asOf: '2000–2025, EUR' },
  equityVol: { id: 'equityVol', value: 15, unit: '%/yr', source: 'msci', asOf: 'annualised' },
  equityWorst: { id: 'equityWorst', value: -37, unit: '%', source: 'msci', asOf: '2008, EUR' },
  basiszins2026: { id: 'basiszins2026', value: 3.2, unit: '%', source: 'bmfBasiszins', asOf: '2026' },
};

/** Tornado ends (plausible 30-year averages) and breakeven search ranges (what history has seen). */
export const RANGES: KnobRanges = {
  priceGrowth: { low: 0.5, high: 5, min: -2, max: 7 },
  rentGrowth: { low: 1, high: 4, min: -1, max: 6 },
  expectedReturn: { low: 4, high: 8.5, min: 0, max: 12 },
  drift: { low: -0.3, high: 0.5, min: -0.8, max: 1 },
  followUpShift: { low: -1.5, high: 1.5, min: -3, max: 3 },
  savings: { low: -25, high: 25, min: -50, max: 50 },
};

export interface NamedScenario extends ScenarioDef {
  sources: SourceId[];
}

/** Named macro scenarios with co-moving values. Overrides apply for the first `years` years, then the base case. */
export const SCENARIOS: NamedScenario[] = [
  { id: 'base', override: () => null, sources: [] },
  {
    // After 2022–23: rates up ≈ 2.5 pp in two years, prices down ≈ 13 %.
    id: 'rateShock',
    override: () => ({ years: 2, priceGrowth: -6.5, drift: 1.25, driftYears: 2 }),
    sources: ['bbkRates', 'destatisHpi', 'greix'],
  },
  {
    // After 1995–2009: flat real prices, slow rents, weaker markets.
    id: 'stagnation',
    override: (i) => ({
      years: 100,
      priceGrowth: i.sim.cpi,
      rentGrowth: Math.max(0, i.sim.cpi - 0.5),
      expectedReturn: i.invest.expectedReturn - 1.5,
    }),
    sources: ['bbkProperty', 'destatisRent', 'msci'],
  },
  {
    // After 2010–21: strong prices and rents, falling rates.
    id: 'boom',
    override: () => ({ years: 10, priceGrowth: 6, rentGrowth: 3.5, drift: -0.3, driftYears: 5 }),
    sources: ['destatisHpi', 'bbkRates'],
  },
];
