// Precomputed monthly paths for one set of inputs. Shared by every strategy of a grid run.

import { churchRate, feeRates, type FeeRates } from './fees';
import { effToNominal, type RateParams } from './rates';
import { ALLOWANCE, capitalTaxRate, TEILFREISTELLUNG, type TaxParams } from './tax';
import type { Inputs, SimContext } from './types';
import { absMonth, annualToMonthly, horizonMonths } from './util';

/** Overrides for a named macro scenario; growth values in %/yr apply for the first `years` years. */
export interface ScenarioOverride {
  years: number;
  priceGrowth?: number;
  rentGrowth?: number;
  expectedReturn?: number;
  /** replace drift (pp/yr) and its duration */
  drift?: number;
  driftYears?: number;
}

export interface PrepareOptions {
  /** pp added to every follow-up rate */
  followUpShift?: number;
  override?: ScenarioOverride | null;
}

export const BASISZINS_KNOWN: Record<number, number> = { 2026: 0.032 };

export interface Model {
  inputs: Inputs;
  ctx: SimContext;
  /** months simulated (month N−1 is December of the horizon year) */
  N: number;
  /** last buy month on the grid */
  maxBuy: number;
  abs0: number;
  /** CPI at the start of month t; cpi[N] is the horizon */
  cpi: Float64Array;
  price: Float64Array;
  rent: Float64Array;
  budget: Float64Array;
  income: Float64Array;
  ownerCost: Float64Array;
  navM: Float64Array;
  valueM: Float64Array;
  cashM: number;
  incomeGrowthM: number;
  tax: TaxParams;
  rates: RateParams;
  toNominal: (eff: number) => number;
  fees: FeeRates;
  oneOff: number;
  tilgung: number;
  sonder: number;
  fixMonths: number;
  /** maximum bank LTV (loan ÷ Beleihungswert) */
  maxLtv: number;
  maxShare: number;
  financeFees: boolean;
  cushion: number;
  capital: number;
  capitalCost: number;
  cash0: number;
  moneyIn: number;
  liquidate: boolean;
  selling: number;
  hessengeld: { eligible: boolean; buyers: number; childBirthYears: number[]; extension: boolean };
  basiszins: (year: number) => number;
}

export function prepare(inputs: Inputs, ctx: SimContext, opts: PrepareOptions = {}): Model {
  const { you, invest, rent, property: pr, mortgage: mo, sim } = inputs;
  const ov = opts.override ?? null;
  const N = horizonMonths(inputs, ctx);
  const maxBuy = Math.max(0, Math.min(Math.round(sim.maxWait * 12), N - 1));
  const ovMonths = ov ? ov.years * 12 : 0;
  const pick = (t: number, base: number, o: number | undefined) => (o !== undefined && t < ovMonths ? o : base);

  const cpiM = annualToMonthly(sim.cpi / 100);
  const cpi = new Float64Array(N + 1);
  const price = new Float64Array(N);
  const rentA = new Float64Array(N);
  const budget = new Float64Array(N);
  const income = new Float64Array(N);
  const ownerCost = new Float64Array(N);
  const navM = new Float64Array(N);
  const valueM = new Float64Array(N);

  const savingsM = annualToMonthly(you.savingsGrowth / 100);
  const incomeGrowthM = annualToMonthly(you.incomeGrowth / 100);
  const ownerBase =
    pr.type === 'apartment'
      ? (pr.hausgeld + pr.maintenance) * pr.area + pr.grundsteuer / 12
      : pr.maintenance * pr.area + (pr.insurance + pr.grundsteuer) / 12;

  let c = 1;
  let p = pr.price;
  let r = rent.coldRent;
  for (let t = 0; t < N; t++) {
    cpi[t] = c;
    price[t] = p;
    rentA[t] = r;
    const savings = you.monthlySavings * Math.pow(1 + savingsM, t);
    budget[t] = r + savings;
    income[t] = you.netIncome * Math.pow(1 + incomeGrowthM, t);
    ownerCost[t] = ownerBase * c;
    const gp = pick(t, pr.priceGrowth, ov?.priceGrowth) / 100;
    const gr = pick(t, rent.rentGrowth, ov?.rentGrowth) / 100;
    const ret = pick(t, invest.expectedReturn, ov?.expectedReturn) / 100;
    navM[t] = annualToMonthly(ret);
    valueM[t] = annualToMonthly(gp - pr.ageingDrag / 100);
    c *= 1 + cpiM;
    p *= 1 + annualToMonthly(gp);
    r *= 1 + annualToMonthly(gr);
  }
  cpi[N] = c;

  let moneyIn = you.capital + you.cash;
  for (let t = 0; t < N; t++) moneyIn += budget[t];

  const fixIdx = [5, 10, 15, 20].indexOf(mo.fixationYears);
  const rates: RateParams = {
    tiers: mo.rateTiers.map((x) => x / 100),
    fixAdj: (mo.fixationAdj[fixIdx < 0 ? 1 : fixIdx] ?? 0) / 100,
    drift: (ov?.drift ?? mo.drift) / 100,
    driftYears: ov?.driftYears ?? mo.driftYears,
    bwFactor: 1 - mo.bwDiscount / 100,
    followUpMode: mo.followUpMode,
    followUpRate: mo.followUpRate / 100,
    followUpShift: (opts.followUpShift ?? 0) / 100,
  };

  const basiszinsFuture = invest.basiszins / 100;
  return {
    inputs,
    ctx,
    N,
    maxBuy,
    abs0: absMonth(ctx, 0),
    cpi,
    price,
    rent: rentA,
    budget,
    income,
    ownerCost,
    navM,
    valueM,
    cashM: annualToMonthly(invest.cashRate / 100),
    incomeGrowthM,
    tax: {
      rate: capitalTaxRate(you.churchTax, churchRate(pr.state)),
      tf: TEILFREISTELLUNG[invest.fundType],
      allowance: ALLOWANCE[you.household],
    },
    rates,
    toNominal: effToNominal,
    fees: feeRates(pr.state, pr.notaryPct, pr.brokerPct, pr.noBroker),
    oneOff: pr.oneOffCosts,
    tilgung: mo.tilgung / 100,
    sonder: mo.sondertilgung / 100,
    fixMonths: mo.fixationYears * 12,
    maxLtv: mo.financeFees ? 1.1 : 1.0,
    maxShare: mo.maxPaymentShare / 100,
    financeFees: mo.financeFees,
    cushion: you.cushion,
    capital: you.capital,
    capitalCost: you.capital * (1 - you.capitalGainPct / 100),
    cash0: you.cash,
    moneyIn,
    liquidate: sim.liquidate,
    selling: sim.sellingCosts / 100,
    hessengeld: {
      eligible: pr.state === 'HE' && you.firstTimeBuyer,
      buyers: you.household === 'couple' ? 2 : 1,
      childBirthYears: you.childBirthYears,
      extension: pr.hessengeldExtension,
    },
    basiszins: (year) => BASISZINS_KNOWN[year] ?? basiszinsFuture,
  };
}

/** Net income at month t, also past the horizon. */
export const incomeAt = (m: Model, t: number): number =>
  t < m.N ? m.income[t] : m.inputs.you.netIncome * Math.pow(1 + m.incomeGrowthM, t);
