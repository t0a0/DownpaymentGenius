// Rate lookup. Inputs are effective annual rates (as quoted); the annuity runs on the nominal Sollzins.

export const TIER_EDGES = [0.6, 0.7, 0.8, 0.9, 1.0];
export const FIXATIONS = [5, 10, 15, 20] as const;
export const RATE_FLOOR = 0.005;
const EPS = 1e-9;

/** 0..5 for ≤60, ≤70, ≤80, ≤90, ≤100, >100 % */
export function tierIndex(bankLtv: number): number {
  for (let i = 0; i < TIER_EDGES.length; i++) if (bankLtv <= TIER_EDGES[i] + EPS) return i;
  return TIER_EDGES.length;
}

/** Effective annual rate → nominal annual rate with monthly compounding: 12·((1+eff)^(1/12) − 1). */
export const effToNominal = (eff: number): number => 12 * (Math.pow(1 + eff, 1 / 12) - 1);

export interface RateParams {
  /** decimals, 6 tiers */
  tiers: number[];
  /** decimal surcharge for the chosen Zinsbindung */
  fixAdj: number;
  /** decimal per year */
  drift: number;
  driftYears: number;
  bwFactor: number;
  followUpMode: 'auto' | 'manual';
  /** decimal */
  followUpRate: number;
  /** decimal, added to every follow-up rate (sensitivity / stress test) */
  followUpShift: number;
}

/** Cumulative drift at month t (decimal), applied for at most driftYears. */
export const driftAt = (p: RateParams, t: number): number => p.drift * Math.min(t / 12, p.driftYears);

export const bankLtvOf = (p: RateParams, loan: number, value: number): number =>
  loan <= 0 ? 0 : loan / (value * p.bwFactor);

/** Effective rate for a new loan at month t. */
export function purchaseRate(p: RateParams, bankLtv: number, t: number): number {
  return Math.max(RATE_FLOOR, p.tiers[tierIndex(bankLtv)] + p.fixAdj + driftAt(p, t));
}

/** Effective follow-up rate at refinancing month t, re-tiered by balance ÷ current value (auto mode). */
export function followUpRate(p: RateParams, balance: number, value: number, t: number): number {
  const base =
    p.followUpMode === 'manual'
      ? p.followUpRate
      : p.tiers[tierIndex(bankLtvOf(p, balance, value))] + p.fixAdj + driftAt(p, t);
  return Math.max(RATE_FLOOR, base + p.followUpShift);
}

/** What the last €10k borrowed costs per year, as a rate: (r(L)·L − r(L−10k)·(L−10k)) / 10k. */
export function marginalRate(p: RateParams, loan: number, price: number, t: number, step = 10_000): number | null {
  if (loan <= 0) return null;
  const lo = Math.max(0, loan - step);
  const rHi = purchaseRate(p, bankLtvOf(p, loan, price), t);
  const rLo = lo > 0 ? purchaseRate(p, bankLtvOf(p, lo, price), t) : 0;
  return (rHi * loan - rLo * lo) / (loan - lo);
}
