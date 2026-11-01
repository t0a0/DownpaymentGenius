import type { Inputs, SimContext } from './types';

/** Annual rate (decimal) → equivalent monthly compounding rate. */
export const annualToMonthly = (a: number): number => Math.pow(1 + a, 1 / 12) - 1;

export const absMonth = (ctx: SimContext, t: number): number => ctx.startYear * 12 + ctx.startMonth + t;

export function calendar(ctx: SimContext, t: number): { year: number; month: number } {
  const abs = absMonth(ctx, t);
  return { year: Math.floor(abs / 12), month: abs % 12 };
}

/** Calendar year whose end is the horizon. */
export function horizonYearOf(inputs: Inputs, ctx: SimContext): number {
  const y = inputs.sim.horizonMode === 'age' ? inputs.you.birthYear + inputs.sim.horizonAge : inputs.sim.horizonYear;
  return Math.max(y, ctx.startYear + 2);
}

/** Months from month 0 up to the end of December of the horizon year. */
export function horizonMonths(inputs: Inputs, ctx: SimContext): number {
  return (horizonYearOf(inputs, ctx) - ctx.startYear) * 12 + (12 - ctx.startMonth);
}

export const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
