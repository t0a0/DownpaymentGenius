import { describe, expect, it } from 'vitest';
import {
  breakeven,
  capitalTaxRate,
  churchRate,
  defaultInputs,
  effToNominal,
  feeRates,
  hessengeld,
  type Inputs,
  type KnobRanges,
  loanStep,
  marginalRate,
  openLoan,
  optimize,
  Portfolio,
  prepare,
  purchaseFees,
  purchaseRate,
  type RateParams,
  scaleBuckets,
  simulate,
  tierIndex,
  totalLost,
  totalMade,
} from './index';

const ctx = { startYear: 2026, startMonth: 10 };
const base = (): Inputs => defaultInputs(ctx);

const RANGES: KnobRanges = {
  priceGrowth: { low: 0.5, high: 5, min: -2, max: 7 },
  rentGrowth: { low: 1, high: 4, min: -1, max: 6 },
  expectedReturn: { low: 4, high: 8.5, min: 0, max: 12 },
  drift: { low: -0.5, high: 0.5, min: -1, max: 1 },
  followUpShift: { low: -1.5, high: 1.5, min: -3, max: 3 },
  savings: { low: -25, high: 25, min: -50, max: 50 },
};

describe('mortgage', () => {
  it('annuity: €200k at 4 % nominal with 2 % Tilgung pays €1,000/month; 10y balance matches closed form', () => {
    const l = openLoan(200_000, 0.0407, 0.04, 0.02, 0, 0, 120);
    expect(l.payment).toBeCloseTo(1000, 10);
    for (let t = 0; t < 120; t++) loanStep(l, t, () => 0.04, effToNominal);
    const i = 0.04 / 12;
    const q = Math.pow(1 + i, 120);
    const closed = 200_000 * q - (1000 * (q - 1)) / i;
    expect(l.balance).toBeCloseTo(closed, 6);
  });

  it('effective → nominal: 4.06 % eff ≈ 3.986 % nominal', () => {
    expect(effToNominal(0.0406)).toBeCloseTo(0.03986, 4);
  });

  it('refinancing keeps the payment but raises it to interest + 1 % repayment', () => {
    const l = openLoan(100_000, 0.02, 0.02, 0.02, 0, 0, 12);
    const p0 = l.payment;
    for (let t = 0; t < 12; t++) loanStep(l, t, () => 0.02, (x) => x);
    const st = loanStep(l, 12, () => 0.08, (x) => x);
    expect(st.refi).not.toBeNull();
    expect(l.payment).toBeCloseTo(Math.max(p0, (st.refi!.balance * 0.09) / 12), 8);
  });
});

describe('fees', () => {
  it('€300k in NRW with 2 % notary and 3.57 % broker gives €36,210', () => {
    expect(purchaseFees(300_000, feeRates('NW', 2, 3.57, false)).total).toBeCloseTo(36_210, 6);
    expect(purchaseFees(300_000, feeRates('NW', 2, 3.57, true)).broker).toBe(0);
  });
  it('church tax 8 % in BY/BW, 9 % elsewhere', () => {
    expect(churchRate('BY')).toBe(0.08);
    expect(churchRate('BW')).toBe(0.08);
    expect(churchRate('HE')).toBe(0.09);
  });
});

describe('Hessengeld (official FAQ examples, 6 % GrESt)', () => {
  const kids = [2015, 2018];
  const at = (grest: number, buyers = 2, children = kids, y = 2027, mo = 2, ext = false) =>
    hessengeld({ purchaseYear: y, purchaseMonth: mo, buyers, childBirthYears: children, grest, assumeExtension: ext });

  it('2 buyers + 2 children at €400k → €24,000 (GrESt cap), €2,400/yr', () => {
    const r = at(400_000 * 0.06);
    expect(r.total).toBe(24_000);
    expect(r.perInstallment).toBe(2_400);
    expect(r.installments).toBe(10);
  });
  it('at €500k → €30,000; at €600k → €30,000', () => {
    expect(at(500_000 * 0.06).total).toBe(30_000);
    expect(at(600_000 * 0.06).total).toBe(30_000);
  });
  it('1 buyer + 2 children with €15,000 GrESt → €15,000', () => {
    expect(at(15_000, 1).total).toBe(15_000);
  });
  it('a child who turns 18 before the purchase month no longer counts', () => {
    expect(at(100_000, 2, [2009], 2027, 4).eligibleChildren).toBe(1);
    expect(at(100_000, 2, [2009], 2027, 7).eligibleChildren).toBe(0);
    expect(at(100_000, 2, [2028], 2027, 7).eligibleChildren).toBe(0);
  });
  it('purchase after Oct 2029 → €0 unless "assume extension"', () => {
    expect(at(30_000, 2, [], 2029, 9).total).toBe(20_000);
    expect(at(30_000, 2, [], 2029, 10).total).toBe(0);
    expect(at(30_000, 2, [], 2029, 10, true).total).toBe(20_000);
  });
  it('installments arrive in the simulation, first one 6 months after purchase', () => {
    const i = base();
    i.property.state = 'HE';
    i.property.city = 'other';
    i.you.capital = 400_000;
    const m = prepare(i, ctx);
    const r = simulate(m, { buyMonth: 0, ltv: 0.6 }, { record: true });
    expect(r.feasible).toBe(true);
    expect(r.purchase!.hessengeld).toBe(10_000);
    expect(r.buckets.subsidies).toBeCloseTo(10_000, 6);
  });
});

describe('rates', () => {
  const p: RateParams = {
    tiers: [0.0406, 0.0416, 0.0426, 0.0448, 0.0471, 0.0521],
    fixAdj: 0,
    drift: 0,
    driftYears: 5,
    bwFactor: 1,
    followUpMode: 'auto',
    followUpRate: 0.045,
    followUpShift: 0,
  };
  it('tier boundaries are inclusive', () => {
    expect(tierIndex(0.6)).toBe(0);
    expect(tierIndex(0.600001)).toBe(1);
    expect(tierIndex(0.8)).toBe(2);
    expect(tierIndex(1.0)).toBe(4);
    expect(tierIndex(1.0001)).toBe(5);
  });
  it('Beleihungswert basis moves the tier edge', () => {
    const i = base();
    i.mortgage.bwDiscount = 15;
    const m = prepare(i, ctx);
    // loan 51 % of price = 60 % of Beleihungswert → best tier
    expect(purchaseRate(m.rates, (0.51 * 100) / (100 * m.rates.bwFactor), 0)).toBeCloseTo(0.0406, 10);
    expect(purchaseRate(m.rates, (0.52 * 100) / (100 * m.rates.bwFactor), 0)).toBeCloseTo(0.0416, 10);
  });
  it('Zinsbindung surcharge and capped drift', () => {
    const i = base();
    i.mortgage.fixationYears = 15;
    i.mortgage.drift = 0.2;
    i.mortgage.driftYears = 2;
    const m = prepare(i, ctx);
    expect(purchaseRate(m.rates, 0.8, 0)).toBeCloseTo(0.0426 + 0.0025, 10);
    expect(purchaseRate(m.rates, 0.8, 120)).toBeCloseTo(0.0426 + 0.0025 + 0.004, 10);
  });
  it('re-tiers by balance ÷ grown value at refinancing', () => {
    const i = base();
    i.you.capital = 200_000;
    i.you.netIncome = 9_000;
    const m = prepare(i, ctx);
    const r = simulate(m, { buyMonth: 0, ltv: 0.9 }, { record: true });
    expect(r.feasible).toBe(true);
    expect(r.purchase!.rateEff).toBeCloseTo(0.0448, 10);
    const refi = r.firstRefi!;
    expect(refi.month).toBe(120);
    const value = r.rows![119].home;
    expect(refi.rateEff).toBeCloseTo(m.rates.tiers[tierIndex(refi.balance / value)], 10);
    expect(refi.rateEff).toBeLessThan(0.0448);
  });
  it('marginal rate of the last €10k jumps when crossing a tier edge', () => {
    expect(marginalRate(p, 700_000, 1_000_000, 0)).toBeCloseTo(0.0416, 10);
    expect(marginalRate(p, 710_000, 1_000_000, 0)).toBeCloseTo((0.0426 * 710_000 - 0.0416 * 700_000) / 10_000, 10);
  });
});

describe('loan periods', () => {
  const rich = (horizonYear = base().sim.horizonYear) => {
    const i = base();
    i.you.capital = 200_000;
    i.you.netIncome = 9_000;
    i.sim.horizonYear = horizonYear;
    return prepare(i, ctx);
  };

  it('chain the fixed-rate periods until the loan is repaid', () => {
    const r = simulate(rich(), { buyMonth: 6, ltv: 0.8 }, { record: true, extend: true });
    expect(r.feasible).toBe(true);
    const ps = r.loanPeriods!;
    expect(ps.length).toBeGreaterThan(1);
    expect(ps[0].start).toBe(6);
    expect(ps[0].balance).toBeCloseTo(r.purchase!.loan, 6);
    expect(ps[0].rateEff).toBe(r.purchase!.rateEff);
    expect(ps[0].payment).toBeCloseTo(r.purchase!.payment, 6);
    expect(ps[1].start).toBe(r.firstRefi!.month);
    expect(ps[1].rateEff).toBe(r.firstRefi!.rateEff);
    expect(ps[1].payment).toBeCloseTo(r.firstRefi!.paymentAfter, 6);
    for (let k = 1; k < ps.length; k++) {
      expect(ps[k].start).toBe(ps[k - 1].end + 1);
      expect(ps[k].start - ps[k - 1].start).toBe(120);
      expect(ps[k].balance).toBeCloseTo(ps[k - 1].balanceEnd, 6);
    }
    for (const p of ps) expect(p.balance - p.principal).toBeCloseTo(p.balanceEnd, 6);
    const last = ps[ps.length - 1];
    expect(last.balanceEnd).toBe(0);
    expect(last.end).toBe(r.debtFreeMonth);
  });

  it('without extension they stop at the horizon and match the interest bucket', () => {
    const m = rich(ctx.startYear + 15);
    const r = simulate(m, { buyMonth: 6, ltv: 0.8 }, { record: true });
    const ps = r.loanPeriods!;
    expect(ps.reduce((a, p) => a + p.interest, 0)).toBeCloseTo(r.buckets.interest, 6);
    expect(ps[ps.length - 1].end).toBe(m.N - 1);
    expect(ps[ps.length - 1].balanceEnd).toBeCloseTo(r.rows![m.N - 1].loan, 6);
  });

  it('cash purchase has none; unrecorded runs skip them', () => {
    const i = base();
    i.you.capital = 600_000;
    const m = prepare(i, ctx);
    expect(simulate(m, { buyMonth: 0, ltv: 0 }, { record: true, extend: true }).loanPeriods).toEqual([]);
    expect(simulate(m, { buyMonth: 0, ltv: 0.5 }).loanPeriods).toBeNull();
  });
});

describe('investment tax', () => {
  it('§32d rate: 26.375 % without church tax, ≈27.819 % at 8 %, ≈27.995 % at 9 %', () => {
    expect(capitalTaxRate(false, 0.09)).toBeCloseTo(0.26375, 10);
    expect(capitalTaxRate(true, 0.08)).toBeCloseTo(0.27819, 5);
    expect(capitalTaxRate(true, 0.09)).toBeCloseTo(0.27995, 5);
  });

  it('Vorabpauschale: €100k at 3.2 % → €2,240 base, €1,568 taxable, ≈€413.6 tax; July lot counts 6/12', () => {
    const pf = new Portfolio({ rate: 0.26375, tf: 0.3, allowance: 0 });
    pf.allowanceLeft = 0;
    pf.buy(100_000, 2025 * 12);
    pf.PyearStart = 1;
    pf.P = 1.1;
    const r = pf.vorabpauschale(2026, 0.032);
    expect(r.vap).toBeCloseTo(2_240, 6);
    expect(r.tax).toBeCloseTo(1_568 * 0.26375, 6);
    expect(r.tax).toBeCloseTo(413.56, 2);

    const pj = new Portfolio({ rate: 0.26375, tf: 0.3, allowance: 0 });
    pj.allowanceLeft = 0;
    pj.PyearStart = 1;
    pj.buy(100_000, 2026 * 12 + 6);
    pj.P = 1.1;
    expect(pj.vorabpauschale(2026, 0.032).vap).toBeCloseTo(1_120, 6);
  });

  it('Vorabpauschale is capped at the year’s gain', () => {
    const pf = new Portfolio({ rate: 0.25, tf: 0, allowance: 0 });
    pf.allowanceLeft = 0;
    pf.buy(100_000, 2025 * 12);
    pf.PyearStart = 1;
    pf.P = 1.01;
    expect(pf.vorabpauschale(2026, 0.032).vap).toBeCloseTo(1_000, 6);
  });

  it('FIFO: a partial sale consumes the oldest lots first', () => {
    const pf = new Portfolio({ rate: 0.25, tf: 0, allowance: 0 });
    pf.allowanceLeft = 0;
    pf.buy(1_000, 0);
    pf.P = 2;
    pf.buy(1_000, 1);
    const s = pf.sellNet(500);
    expect(s.net).toBeCloseTo(500, 9);
    // lot A: value 2,000, gain 1,000 → net per € sold = 1 − 0.25·0.5
    expect(s.gross).toBeCloseTo(500 / 0.875, 9);
    expect(s.tax).toBeCloseTo(s.gross - 500, 9);
    expect(pf.u[1]).toBeCloseTo(500, 9); // lot B untouched
    expect(pf.u[0]).toBeCloseTo(1_000 - s.gross / 2, 9);
  });

  it('Vorabpauschale already taxed lowers the sale gain (no double tax)', () => {
    const a = new Portfolio({ rate: 0.25, tf: 0, allowance: 0 });
    a.allowanceLeft = 0;
    a.buy(1_000, 0);
    a.P = 2;
    const b = a.clone();
    b.v[0] = 400;
    expect(a.sellNet(10_000).tax).toBeCloseTo(250, 9);
    expect(b.sellNet(10_000).tax).toBeCloseTo(150, 9);
  });

  it('allowance and loss pot shield gains', () => {
    const pf = new Portfolio({ rate: 0.25, tf: 0, allowance: 1_000 });
    pf.buy(10_000, 0);
    pf.P = 1.2;
    expect(pf.latentTax()).toBeCloseTo((2_000 - 1_000) * 0.25, 9);
    pf.lossPot = 500;
    expect(pf.latentTax()).toBeCloseTo(500 * 0.25, 9);
  });
});

describe('simulation', () => {
  const variants: [string, (i: Inputs) => void][] = [
    ['default', () => {}],
    ['Hessen + children + Sondertilgung', (i) => {
      i.property.state = 'HE';
      i.you.household = 'couple';
      i.you.childBirthYears = [2020];
      i.mortgage.sondertilgung = 3;
    }],
    ['finance fees + manual follow-up + drift', (i) => {
      i.mortgage.financeFees = true;
      i.mortgage.followUpMode = 'manual';
      i.mortgage.followUpRate = 6;
      i.mortgage.drift = 0.3;
      i.you.netIncome = 9_000;
    }],
    ['house + church tax + mixed fund + 5y fixation', (i) => {
      i.property.type = 'house';
      i.property.maintenance = 1.75;
      i.property.insurance = 500;
      i.property.grundsteuer = 600;
      i.you.churchTax = true;
      i.invest.fundType = 'mixed';
      i.mortgage.fixationYears = 5;
      i.you.capital = 250_000;
    }],
  ];

  for (const [name, mut] of variants) {
    for (const liquidate of [true, false]) {
      it(`accounting identity NW = moneyIn − lost + made (${name}, liquidate ${liquidate})`, () => {
        const i = base();
        i.you.capital = 250_000;
        i.you.netIncome = 8_000;
        mut(i);
        i.sim.liquidate = liquidate;
        const m = prepare(i, ctx);
        const strategies = [
          { buyMonth: null, ltv: 0 },
          { buyMonth: 0, ltv: 0.8 },
          { buyMonth: 37, ltv: 0.6 },
          { buyMonth: 60, ltv: 0.95 },
          { buyMonth: 119, ltv: 0.3 },
          { buyMonth: 119, ltv: 0 },
        ];
        let checked = 0;
        for (const s of strategies) {
          const r = simulate(m, s, { record: true });
          if (!r.feasible) continue;
          checked++;
          const identity = r.moneyIn - totalLost(r.buckets) + totalMade(r.buckets);
          expect(Math.abs(r.nw - identity)).toBeLessThan(1e-6 * r.moneyIn);
          expect(r.rows![r.rows!.length - 1].nw).toBeCloseTo(r.nw, 6);
          // real mode: every bucket divided by CPI_H
          const k = 1 / r.cpiH;
          const rb = scaleBuckets(r.buckets, k);
          expect(Math.abs(r.nw * k - (r.moneyIn * k - totalLost(rb) + totalMade(rb)))).toBeLessThan(1e-6 * r.moneyIn);
        }
        expect(checked).toBeGreaterThan(1);
      });
    }
  }

  it('zero rates, returns, growth, fees and taxes with rent = owner costs make buy now and later equal', () => {
    const i = base();
    Object.assign(i.property, {
      priceGrowth: 0, ageingDrag: 0, notaryPct: 0, noBroker: true, oneOffCosts: 0,
      hausgeld: 0, maintenance: 0, price: 300_000,
    });
    i.property.grundsteuer = i.rent.coldRent * 12;
    Object.assign(i.rent, { rentGrowth: 0 });
    Object.assign(i.invest, { expectedReturn: 0, cashRate: 0, basiszins: 0 });
    Object.assign(i.you, { capital: 500_000, savingsGrowth: 0 });
    Object.assign(i.sim, { cpi: 0, liquidate: false });
    const m = prepare(i, ctx);
    m.fees.grest = 0;
    m.tax.rate = 0;
    const now = simulate(m, { buyMonth: 0, ltv: 0 });
    const later = simulate(m, { buyMonth: 36, ltv: 0 });
    const never = simulate(m, { buyMonth: null, ltv: 0 });
    expect(now.feasible && later.feasible).toBe(true);
    expect(later.nw).toBeCloseTo(now.nw, 6);
    expect(never.nw).toBeCloseTo(now.nw, 6);
  });

  it('rate ≫ return → lowest feasible LTV', () => {
    const i = base();
    i.mortgage.rateTiers = [9, 9, 9, 9, 9, 9];
    i.mortgage.fixationAdj = [0, 0, 0, 0];
    i.invest.expectedReturn = 2;
    i.you.capital = 600_000;
    i.property.price = 300_000;
    const g = optimize(prepare(i, ctx));
    expect(g.best!.ltv).toBe(0);
  });

  it('return ≫ rate without tier surcharges → highest feasible LTV', () => {
    const i = base();
    i.mortgage.rateTiers = [1.5, 1.5, 1.5, 1.5, 1.5, 1.5];
    i.mortgage.fixationAdj = [0, 0, 0, 0];
    i.invest.expectedReturn = 10;
    i.you.netIncome = 20_000;
    i.you.capital = 200_000;
    const g = optimize(prepare(i, ctx));
    expect(g.best!.ltv).toBe(1);
  });

  it('high price growth + high rent → buy now', () => {
    const i = base();
    i.property.priceGrowth = 7;
    i.rent.rentGrowth = 4;
    i.rent.coldRent = 2_500;
    i.invest.expectedReturn = 5;
    i.you.capital = 150_000;
    i.you.netIncome = 8_000;
    const g = optimize(prepare(i, ctx));
    expect(g.best!.month).toBe(0);
    expect(g.best!.nw).toBeGreaterThan(g.never);
  });

  it('infeasible cells are masked; LTV 0 % with capital > price + fees is feasible and leaves the rest invested', () => {
    const i = base();
    const g = optimize(prepare(i, ctx));
    const z = g.ltvs.indexOf(0);
    expect(Number.isNaN(g.nw[z][0])).toBe(true);
    expect(g.reason[z][0]).toBe(0); // capital

    i.you.capital = 600_000;
    i.property.price = 300_000;
    const m = prepare(i, ctx);
    const r = simulate(m, { buyMonth: 0, ltv: 0 }, { record: true });
    expect(r.feasible).toBe(true);
    const fees = r.purchase!.fees.total;
    expect(r.rows![0].portfolio).toBeGreaterThan(600_000 - 300_000 - fees - r.purchase!.saleTax - 1);
    expect(r.purchase!.loan).toBe(0);
  });

  it('payment above the income share is infeasible', () => {
    const i = base();
    i.you.capital = 200_000;
    i.you.netIncome = 2_000;
    const r = simulate(prepare(i, ctx), { buyMonth: 0, ltv: 0.8 });
    expect(r.feasible).toBe(false);
    expect(r.reason).toBe('income');
  });
});

describe('breakeven', () => {
  it('at the reported value the two compared strategies match within €1', () => {
    const i = base();
    const rows = breakeven(i, ctx, RANGES);
    const found = rows.filter((r) => r.value !== null);
    expect(found.length).toBeGreaterThan(0);
    for (const r of found) expect(Math.abs(r.residual!)).toBeLessThan(1);
  });
});
