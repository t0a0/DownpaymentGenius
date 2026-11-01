// One strategy → monthly loop. Equal budget for every strategy: budget_t = cold rent_t + savings_t.
// Renters pay rent and invest the rest; owners pay the annuity and owner costs and invest what remains
// (or sell, taxed, when it is negative). Every euro that leaves is booked in a "lost" bucket and every
// euro of growth in a "made" bucket, so NW_H = moneyIn − lost + made holds by construction.

import { bankCheck } from './constraints';
import { purchaseFees } from './fees';
import { incomeAt, type Model } from './model';
import { annuityPayment, cloneLoan, loanStep, openLoan, trackPeriod, type LoanState } from './mortgage';
import { bankLtvOf, followUpRate, marginalRate, purchaseRate } from './rates';
import { HESSENGELD, hessengeld } from './subsidies';
import { Portfolio } from './tax';
import type {
  Buckets,
  Infeasible,
  LoanPeriod,
  MonthRow,
  PurchaseInfo,
  RefiInfo,
  SimResult,
  Strategy,
  YearRow,
} from './types';

export const zeroBuckets = (): Buckets => ({
  interest: 0,
  rent: 0,
  fees: 0,
  owner: 0,
  taxes: 0,
  selling: 0,
  returns: 0,
  homeGrowth: 0,
  subsidies: 0,
});

export class SimState {
  pf: Portfolio;
  cash = 0;
  owned = false;
  value = 0;
  loan: LoanState | null = null;
  hgInst = 0;
  hgNext = -1;
  hgLeft = 0;
  taxDue = 0;
  principalPaid = 0;
  debtFreeAt = -1;
  b: Buckets = zeroBuckets();
  dead: Infeasible | null = null;
  purchase: PurchaseInfo | null = null;
  firstRefi: RefiInfo | null = null;
  /** fixed-rate periods, only collected for recorded runs */
  periods: LoanPeriod[] | null = null;

  constructor(pf: Portfolio) {
    this.pf = pf;
  }

  clone(): SimState {
    const s = new SimState(this.pf.clone());
    s.cash = this.cash;
    s.owned = this.owned;
    s.value = this.value;
    s.loan = this.loan ? cloneLoan(this.loan) : null;
    s.hgInst = this.hgInst;
    s.hgNext = this.hgNext;
    s.hgLeft = this.hgLeft;
    s.taxDue = this.taxDue;
    s.principalPaid = this.principalPaid;
    s.debtFreeAt = this.debtFreeAt;
    s.b = { ...this.b };
    s.dead = this.dead;
    s.purchase = this.purchase;
    s.firstRefi = this.firstRefi;
    s.periods = this.periods ? this.periods.map((p) => ({ ...p })) : null;
    return s;
  }
}

export function initState(m: Model): SimState {
  const s = new SimState(new Portfolio(m.tax));
  // NAV on 1 January of the start year, extrapolated back, for the first Vorabpauschale.
  s.pf.PyearStart = 1 / Math.pow(1 + m.navM[0], m.ctx.startMonth);
  // Today's portfolio counts as held since before the start year.
  s.pf.buy(m.capital, m.abs0 - 12, m.capitalCost);
  const excess = m.cash0 - m.cushion;
  if (excess > 0) {
    s.cash = m.cushion;
    s.pf.buy(excess, m.abs0);
  } else s.cash = m.cash0;
  return s;
}

function purchase(m: Model, s: SimState, t: number, ltv: number): void {
  const price = m.price[t];
  const fees = purchaseFees(price, m.fees, m.oneOff * m.cpi[t]);
  const loan = ltv * price;
  const bankLtv = bankLtvOf(m.rates, loan, price);
  let eff = 0;
  let nominal = 0;
  let payment = 0;
  if (loan > 0) {
    eff = purchaseRate(m.rates, bankLtv, t);
    nominal = m.toNominal(eff);
    payment = annuityPayment(loan, nominal, m.tilgung);
  }
  const reason = bankCheck(m, { t, loan, price, fees: fees.total, bankLtv, payment });
  if (reason) {
    s.dead = reason;
    return;
  }
  const cashNeeded = price + fees.total - loan;
  const sale = s.pf.sellNet(cashNeeded);
  s.b.taxes += sale.tax;
  if (sale.net < cashNeeded - 0.01) {
    s.dead = 'capital';
    return;
  }
  s.b.fees += fees.total;
  s.owned = true;
  s.value = price;
  if (loan > 0) s.loan = openLoan(loan, eff, nominal, m.tilgung, m.sonder, t, m.fixMonths);
  else s.debtFreeAt = t;

  let hg = 0;
  if (m.hessengeld.eligible) {
    const abs = m.abs0 + t;
    const r = hessengeld({
      purchaseYear: Math.floor(abs / 12),
      purchaseMonth: abs % 12,
      buyers: m.hessengeld.buyers,
      childBirthYears: m.hessengeld.childBirthYears,
      grest: fees.grest,
      assumeExtension: m.hessengeld.extension,
    });
    if (r.total > 0) {
      s.hgInst = r.perInstallment;
      s.hgLeft = r.installments;
      s.hgNext = t + HESSENGELD.firstAfterMonths;
      hg = r.total;
    }
  }
  s.purchase = {
    month: t,
    price,
    fees,
    loan,
    equity: price - loan,
    cashNeeded,
    bankLtv,
    rateEff: eff,
    rateNominal: nominal,
    payment,
    paymentShare: payment / m.income[t],
    saleTax: sale.tax,
    hessengeld: hg,
    marginalRate: marginalRate(m.rates, loan, price, t),
  };
}

/** Run months [from, to). buyMonth −1 = keep renting. Stops early when the strategy becomes infeasible. */
export function runMonths(
  m: Model,
  s: SimState,
  from: number,
  to: number,
  buyMonth: number,
  ltv: number,
  rec?: Recorder,
): void {
  const refi = (t: number, balance: number) => followUpRate(m.rates, balance, s.value, t);
  for (let t = from; t < to; t++) {
    const abs = m.abs0 + t;
    if (abs % 12 === 0 && t > 0) {
      s.pf.newTaxYear();
      const year = Math.floor(abs / 12) - 1;
      s.taxDue += s.pf.vorabpauschale(year, m.basiszins(year)).tax;
    }
    if (t === buyMonth) {
      purchase(m, s, t, ltv);
      if (s.dead) return;
    }

    let inflow = m.budget[t];
    let out = s.taxDue;
    s.b.taxes += s.taxDue;
    s.taxDue = 0;
    if (s.owned) {
      const l = s.loan;
      if (l && l.balance > 0) {
        const st = loanStep(l, t, refi, m.toNominal);
        out += st.interest + st.principal + st.extra;
        s.b.interest += st.interest;
        s.principalPaid += st.principal + st.extra;
        if (s.periods) trackPeriod(s.periods, l, t, st);
        if (st.refi && !s.firstRefi) {
          s.firstRefi = {
            month: t,
            balance: st.refi.balance,
            rateEff: st.refi.eff,
            paymentBefore: st.refi.paymentBefore,
            paymentAfter: st.refi.paymentAfter,
            paymentShare: st.refi.paymentAfter / m.income[t],
          };
        }
        if (l.balance === 0) s.debtFreeAt = t;
      }
      const oc = m.ownerCost[t];
      out += oc;
      s.b.owner += oc;
      if (s.hgLeft > 0 && t === s.hgNext) {
        inflow += s.hgInst;
        s.b.subsidies += s.hgInst;
        s.hgLeft--;
        s.hgNext += 12;
      }
    } else {
      out += m.rent[t];
      s.b.rent += m.rent[t];
    }

    if (s.cash > 0 && m.cashM > 0) {
      const interest = s.cash * m.cashM;
      const tax = s.pf.applyTaxable(interest);
      s.b.returns += interest;
      s.b.taxes += tax;
      s.cash += interest - tax;
    }

    let net = inflow - out;
    if (net >= 0) {
      // Top up the cushion first; anything above it is invested.
      const gap = m.cushion - s.cash;
      if (gap > 0) {
        const x = Math.min(gap, net);
        s.cash += x;
        net -= x;
      } else if (gap < 0) {
        net -= gap;
        s.cash = m.cushion;
      }
      if (net > 1e-9) s.pf.buy(net, abs);
    } else {
      let deficit = -net;
      const sale = s.pf.sellNet(deficit);
      s.b.taxes += sale.tax;
      deficit -= sale.net;
      if (deficit > 1e-9) {
        s.cash -= deficit;
        if (s.cash < -0.5) {
          s.dead = 'cashflow';
          return;
        }
      }
    }

    const g = m.navM[t];
    s.b.returns += s.pf.value * g;
    s.pf.P *= 1 + g;
    if (s.owned) {
      const dv = s.value * m.valueM[t];
      s.b.homeGrowth += dv;
      s.value += dv;
    }
    rec?.month(m, s, t);
  }
}

/** Net worth valued per the "liquidate" toggle. */
export function netWorth(m: Model, s: SimState): number {
  const lat = m.liquidate ? s.pf.latentTax() : 0;
  const home = s.owned ? s.value : 0;
  const sc = m.liquidate ? home * m.selling : 0;
  return s.pf.value - lat + s.cash + home - sc - (s.loan?.balance ?? 0);
}

/** Book the horizon valuation (latent tax, selling costs) and return NW_H. Mutates the state's buckets. */
export function finalize(m: Model, s: SimState): number {
  const lat = m.liquidate ? s.pf.latentTax() : 0;
  const home = s.owned ? s.value : 0;
  const sc = m.liquidate ? home * m.selling : 0;
  s.b.taxes += lat;
  s.b.selling += sc;
  return s.pf.value - lat + s.cash + home - sc - (s.loan?.balance ?? 0);
}

export class Recorder {
  rows: MonthRow[] = [];
  years: YearRow[] = [];
  private y0: Buckets = zeroBuckets();
  private p0 = 0;
  private budget = 0;

  month(m: Model, s: SimState, t: number): void {
    this.budget += m.budget[t];
    const nw = netWorth(m, s);
    const home = s.owned ? s.value : 0;
    const loan = s.loan?.balance ?? 0;
    const portfolio = s.pf.value;
    const cpi = m.cpi[t + 1];
    this.rows.push({ t, portfolio, cash: s.cash, home, loan, nw, cpi });
    const abs = m.abs0 + t;
    if (abs % 12 === 11 || t === m.N - 1) {
      const b = s.b;
      const y = this.y0;
      this.years.push({
        year: Math.floor(abs / 12),
        budget: this.budget,
        rent: b.rent - y.rent,
        interest: b.interest - y.interest,
        principal: s.principalPaid - this.p0,
        owner: b.owner - y.owner,
        taxes: b.taxes - y.taxes,
        subsidies: b.subsidies - y.subsidies,
        portfolio,
        cash: s.cash,
        home,
        loan,
        nw,
        cpi,
      });
      this.y0 = { ...b };
      this.p0 = s.principalPaid;
      this.budget = 0;
    }
  }
}

/** Continue the loan past the horizon (up to 60 years after purchase) to find the debt-free month. */
function debtFreeMonth(m: Model, s: SimState): number | null {
  if (!s.owned) return null;
  if (!s.loan || s.loan.balance <= 0) return s.debtFreeAt >= 0 ? s.debtFreeAt : null;
  const l = cloneLoan(s.loan);
  let value = s.value;
  const g = m.valueM[m.N - 1];
  const limit = l.start + 720;
  for (let t = m.N; t < limit; t++) {
    const st = loanStep(l, t, (tt, bal) => followUpRate(m.rates, bal, value, tt), m.toNominal);
    if (s.periods) trackPeriod(s.periods, l, t, st);
    if (st.refi && !s.firstRefi) {
      s.firstRefi = {
        month: t,
        balance: st.refi.balance,
        rateEff: st.refi.eff,
        paymentBefore: st.refi.paymentBefore,
        paymentAfter: st.refi.paymentAfter,
        paymentShare: st.refi.paymentAfter / incomeAt(m, t),
      };
    }
    if (l.balance <= 0) return t;
    value *= 1 + g;
  }
  return null;
}

export interface SimOptions {
  record?: boolean;
  /** simulate the loan past the horizon for the debt-free date and the first refinancing */
  extend?: boolean;
}

export function simulate(m: Model, strategy: Strategy, opts: SimOptions = {}): SimResult {
  const s = initState(m);
  const rec = opts.record ? new Recorder() : undefined;
  if (opts.record) s.periods = [];
  runMonths(m, s, 0, m.N, strategy.buyMonth ?? -1, strategy.ltv, rec);
  if (s.dead) {
    return {
      strategy,
      feasible: false,
      reason: s.dead,
      nw: NaN,
      moneyIn: m.moneyIn,
      buckets: s.b,
      cpiH: m.cpi[m.N],
      purchase: s.purchase,
      firstRefi: null,
      debtFreeMonth: null,
      loanPeriods: null,
      rows: rec?.rows ?? null,
      years: rec?.years ?? null,
    };
  }
  const debtFree = opts.extend ? debtFreeMonth(m, s) : s.debtFreeAt >= 0 ? s.debtFreeAt : null;
  const nw = finalize(m, s);
  return {
    strategy,
    feasible: true,
    reason: null,
    nw,
    moneyIn: m.moneyIn,
    buckets: s.b,
    cpiH: m.cpi[m.N],
    purchase: s.purchase,
    firstRefi: s.firstRefi,
    debtFreeMonth: debtFree,
    loanPeriods: s.periods,
    rows: rec?.rows ?? null,
    years: rec?.years ?? null,
  };
}

export const totalLost = (b: Buckets): number => b.interest + b.rent + b.fees + b.owner + b.taxes + b.selling;
export const totalMade = (b: Buckets): number => b.returns + b.homeGrowth + b.subsidies;
/** Net money lost = moneyIn − NW_H = lost − made. */
export const netLost = (b: Buckets): number => totalLost(b) - totalMade(b);
