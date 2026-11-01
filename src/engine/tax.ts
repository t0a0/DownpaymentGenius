// German investment tax: Abgeltungsteuer + Soli + church tax (§32d EStG), Teilfreistellung, Sparerpauschbetrag,
// Vorabpauschale (§18 InvStG) and FIFO lots. One lot per contribution.

import type { FundType } from './types';
import { clamp } from './util';

/** Total rate on capital income: Est = 1/(4+k) of the income, plus 5.5 % Soli and k church tax on Est. */
export function capitalTaxRate(churchTax: boolean, churchRate: number): number {
  const k = churchTax ? churchRate : 0;
  return (1 + 0.055 + k) / (4 + k);
}

export const TEILFREISTELLUNG: Record<FundType, number> = { equity: 0.3, mixed: 0.15, bond: 0 };
export const ALLOWANCE = { single: 1_000, couple: 2_000 };
/** Vorabpauschale: start-of-year value × Basiszins × 70 % */
export const VAP_FACTOR = 0.7;

export interface TaxParams {
  rate: number;
  tf: number;
  allowance: number;
}

export interface SaleResult {
  net: number;
  gross: number;
  tax: number;
}

export class Portfolio {
  /** per lot: units, cost, accumulated taxed Vorabpauschale (gross, before Teilfreistellung), acquisition abs month */
  u: number[] = [];
  c: number[] = [];
  v: number[] = [];
  acq: number[] = [];
  /** first lot that still holds units (FIFO) */
  head = 0;
  units = 0;
  /** unit price (NAV) */
  P = 1;
  /** NAV on 1 January of the current calendar year */
  PyearStart = 1;
  allowanceLeft: number;
  lossPot = 0;
  readonly tp: TaxParams;

  constructor(tp: TaxParams) {
    this.tp = tp;
    this.allowanceLeft = tp.allowance;
  }

  clone(): Portfolio {
    const p = new Portfolio(this.tp);
    p.u = this.u.slice(this.head);
    p.c = this.c.slice(this.head);
    p.v = this.v.slice(this.head);
    p.acq = this.acq.slice(this.head);
    p.units = this.units;
    p.P = this.P;
    p.PyearStart = this.PyearStart;
    p.allowanceLeft = this.allowanceLeft;
    p.lossPot = this.lossPot;
    return p;
  }

  get value(): number {
    return this.units * this.P;
  }

  get lotCount(): number {
    return this.u.length - this.head;
  }

  buy(amount: number, absMonth: number, cost = amount): void {
    if (amount <= 0) return;
    const units = amount / this.P;
    this.u.push(units);
    this.c.push(cost);
    this.v.push(0);
    this.acq.push(absMonth);
    this.units += units;
  }

  /** Book taxable income (after Teilfreistellung) against loss pot and allowance; returns the tax due. */
  applyTaxable(x: number): number {
    if (x <= 0) {
      this.lossPot -= x;
      return 0;
    }
    let rem = x;
    const fromLoss = Math.min(this.lossPot, rem);
    this.lossPot -= fromLoss;
    rem -= fromLoss;
    const fromAllowance = Math.min(this.allowanceLeft, rem);
    this.allowanceLeft -= fromAllowance;
    rem -= fromAllowance;
    return rem * this.tp.rate;
  }

  newTaxYear(): void {
    this.allowanceLeft = this.tp.allowance;
  }

  /** Sell oldest lots first until `need` € arrive after tax. Returns less than `need` if the portfolio runs out. */
  sellNet(need: number): SaleResult {
    const { rate, tf } = this.tp;
    let net = 0;
    let gross = 0;
    let tax = 0;
    while (need - net > 1e-9 && this.head < this.u.length) {
      const i = this.head;
      const ui = this.u[i];
      if (ui <= 1e-15) {
        this.head++;
        continue;
      }
      const V = ui * this.P;
      const T = (V - this.c[i] - this.v[i]) * (1 - tf);
      const shield = this.lossPot + this.allowanceLeft;
      const remaining = need - net;
      const taxFull = T > shield ? (T - shield) * rate : 0;
      let f: number;
      if (V - taxFull <= remaining + 1e-9) f = 1;
      else if (T <= 0 || remaining <= (shield / T) * V) f = remaining / V;
      else f = (remaining - rate * shield) / (V - rate * T);
      f = clamp(f, 0, 1);
      const t = this.applyTaxable(f * T);
      const g = f * V;
      gross += g;
      tax += t;
      net += g - t;
      if (f >= 1 - 1e-12) {
        this.units -= ui;
        this.u[i] = 0;
        this.head++;
      } else {
        this.u[i] = ui * (1 - f);
        this.c[i] *= 1 - f;
        this.v[i] *= 1 - f;
        this.units -= ui * f;
      }
    }
    if (this.head === this.u.length) this.units = 0;
    return { net, gross, tax };
  }

  /** Tax that would be due if everything were sold now (does not change state). */
  latentTax(): number {
    let gain = 0;
    for (let i = this.head; i < this.u.length; i++) gain += this.u[i] * this.P - this.c[i] - this.v[i];
    const T = gain * (1 - this.tp.tf);
    const shield = this.lossPot + this.allowanceLeft;
    return T > shield ? (T - shield) * this.tp.rate : 0;
  }

  /** Value after the tax a full sale would cost. */
  get netValue(): number {
    return this.value - this.latentTax();
  }

  /**
   * Vorabpauschale for calendar year `year`, assessed in early January of year+1 (call after newTaxYear()).
   * Per unit: min(NAV on 1 Jan × Basiszins × 70 %, the year's NAV gain); units bought during the year count
   * pro rata, −1/12 for each full month before purchase. Each lot remembers what was taxed so a later sale
   * is not taxed twice. Returns { vap (gross), tax }.
   */
  vorabpauschale(year: number, basiszins: number): { vap: number; tax: number } {
    const per = Math.min(this.PyearStart * VAP_FACTOR * basiszins, Math.max(0, this.P - this.PyearStart));
    this.PyearStart = this.P;
    if (per <= 0) return { vap: 0, tax: 0 };
    let total = 0;
    for (let i = this.head; i < this.u.length; i++) {
      if (this.u[i] <= 0) continue;
      const ay = Math.floor(this.acq[i] / 12);
      const frac = ay < year ? 1 : ay === year ? (12 - (this.acq[i] % 12)) / 12 : 0;
      const vap = this.u[i] * per * frac;
      this.v[i] += vap;
      total += vap;
    }
    return { vap: total, tax: this.applyTaxable(total * (1 - this.tp.tf)) };
  }
}
