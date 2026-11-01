// Sensitivity (tornado), named macro scenarios, breakeven search and the refinancing stress test.
// All grid searches here run at quarterly resolution.

import { prepare, type Model, type PrepareOptions, type ScenarioOverride } from './model';
import { optimize } from './optimize';
import { simulate } from './simulate';
import type { GridResult, Inputs, RefiInfo, SimContext, Strategy } from './types';

export const QUARTERLY = { monthStep: 3 };

export type Knob = 'priceGrowth' | 'rentGrowth' | 'expectedReturn' | 'drift' | 'followUpShift' | 'savings';
export const TORNADO_KNOBS: Knob[] = ['priceGrowth', 'rentGrowth', 'expectedReturn', 'drift', 'followUpShift', 'savings'];
export const BREAKEVEN_KNOBS: Knob[] = ['priceGrowth', 'expectedReturn', 'rentGrowth', 'drift'];

export interface KnobRange {
  /** tornado ends */
  low: number;
  high: number;
  /** breakeven search range */
  min: number;
  max: number;
}
export type KnobRanges = Record<Knob, KnobRange>;

/** Current value of a knob in the inputs (savings is a % change, followUpShift a pp shift, both 0 at base). */
export function knobBase(inputs: Inputs, k: Knob): number {
  switch (k) {
    case 'priceGrowth':
      return inputs.property.priceGrowth;
    case 'rentGrowth':
      return inputs.rent.rentGrowth;
    case 'expectedReturn':
      return inputs.invest.expectedReturn;
    case 'drift':
      return inputs.mortgage.drift;
    case 'followUpShift':
    case 'savings':
      return 0;
  }
}

export function applyKnob(inputs: Inputs, k: Knob, value: number): { inputs: Inputs; opts: PrepareOptions } {
  const i: Inputs = structuredClone(inputs);
  const opts: PrepareOptions = {};
  switch (k) {
    case 'priceGrowth':
      i.property.priceGrowth = value;
      break;
    case 'rentGrowth':
      i.rent.rentGrowth = value;
      break;
    case 'expectedReturn':
      i.invest.expectedReturn = value;
      break;
    case 'drift':
      i.mortgage.drift = value;
      break;
    case 'followUpShift':
      opts.followUpShift = value;
      break;
    case 'savings':
      i.you.monthlySavings = inputs.you.monthlySavings * (1 + value / 100);
      break;
  }
  return { inputs: i, opts };
}

export interface TornadoPoint {
  value: number;
  nw: number;
  bestMonth: number | null;
}

export interface TornadoRow {
  knob: Knob;
  base: number;
  low: TornadoPoint;
  high: TornadoPoint;
}

export interface TornadoResult {
  baseNw: number;
  baseMonth: number | null;
  rows: TornadoRow[];
}

/** NW of the best overall choice, counting "never buy" as a choice. */
function bestChoice(g: GridResult): { nw: number; month: number | null } {
  if (g.best && g.best.nw >= g.never) return { nw: g.best.nw, month: g.best.month };
  return { nw: g.never, month: null };
}

function point(inputs: Inputs, ctx: SimContext, k: Knob, value: number): TornadoPoint {
  const a = applyKnob(inputs, k, value);
  const g = optimize(prepare(a.inputs, ctx, a.opts), QUARTERLY);
  const b = bestChoice(g);
  return { value, nw: b.nw, bestMonth: b.month };
}

export function tornado(inputs: Inputs, ctx: SimContext, ranges: KnobRanges, knobs = TORNADO_KNOBS): TornadoResult {
  const base = bestChoice(optimize(prepare(inputs, ctx), QUARTERLY));
  const rows = knobs.map((k) => ({
    knob: k,
    base: knobBase(inputs, k),
    low: point(inputs, ctx, k, ranges[k].low),
    high: point(inputs, ctx, k, ranges[k].high),
  }));
  rows.sort((a, b) => Math.abs(b.high.nw - b.low.nw) - Math.abs(a.high.nw - a.low.nw));
  return { baseNw: base.nw, baseMonth: base.month, rows };
}

// ---------- scenarios ----------

export interface ScenarioDef {
  id: string;
  override: (inputs: Inputs) => ScenarioOverride | null;
}

export interface ScenarioLine {
  /** net worth per month (end of month), NaN when infeasible */
  nw: Float64Array;
  final: number;
}

export interface ScenarioRun {
  id: string;
  best: { month: number; ltv: number; nw: number } | null;
  never: number;
  /** one line per requested strategy, same order */
  lines: ScenarioLine[];
}

export interface ScenarioResult {
  runs: ScenarioRun[];
  /** per strategy: min / max over scenarios, per month */
  bands: { lo: Float64Array; hi: Float64Array }[];
}

export function scenarios(
  inputs: Inputs,
  ctx: SimContext,
  defs: ScenarioDef[],
  strategies: Strategy[],
): ScenarioResult {
  const runs: ScenarioRun[] = defs.map((d) => {
    const m = prepare(inputs, ctx, { override: d.override(inputs) });
    const g = optimize(m, QUARTERLY);
    const lines = strategies.map((s) => {
      const r = simulate(m, s, { record: true });
      const nw = new Float64Array(m.N).fill(NaN);
      if (r.feasible && r.rows) for (const row of r.rows) nw[row.t] = row.nw;
      return { nw, final: r.nw };
    });
    return { id: d.id, best: g.best, never: g.never, lines };
  });
  const N = runs[0]?.lines[0]?.nw.length ?? 0;
  const bands = strategies.map((_, k) => {
    const lo = new Float64Array(N).fill(NaN);
    const hi = new Float64Array(N).fill(NaN);
    for (let t = 0; t < N; t++) {
      let a = Infinity;
      let b = -Infinity;
      for (const r of runs) {
        const v = r.lines[k].nw[t];
        if (Number.isNaN(v)) continue;
        if (v < a) a = v;
        if (v > b) b = v;
      }
      if (a <= b) {
        lo[t] = a;
        hi[t] = b;
      }
    }
    return { lo, hi };
  });
  return { runs, bands };
}

// ---------- breakeven ----------

export type BreakevenKind = 'nowVsWait' | 'buyVsNever';

export interface BreakevenRow {
  knob: Knob;
  kind: BreakevenKind;
  min: number;
  max: number;
  /** knob value where the two strategies tie; null = no flip within range */
  value: number | null;
  /** the first strategy (buy now / buy) wins above or below `value` */
  winsAbove: boolean | null;
  /** f(value) = NW(first) − NW(second) at the reported value */
  residual: number | null;
  /** which side wins across the whole range when there is no flip */
  alwaysFirst: boolean | null;
}

function diff(inputs: Inputs, ctx: SimContext, k: Knob, x: number, kind: BreakevenKind): number {
  const a = applyKnob(inputs, k, x);
  const g = optimize(prepare(a.inputs, ctx, a.opts), QUARTERLY);
  if (kind === 'nowVsWait') {
    if (!g.buyNow) return -Infinity;
    if (!g.bestWait) return Infinity;
    return g.buyNow.nw - g.bestWait.nw;
  }
  if (!g.best) return -Infinity;
  return g.best.nw - g.never;
}

/** Illinois (modified regula falsi) on a bracketed sign change; stops when |f| < tol € or after maxIter. */
export function findRoot(
  f: (x: number) => number,
  lo: number,
  hi: number,
  flo: number,
  fhi: number,
  tol = 0.5,
  maxIter = 30,
): { x: number; fx: number } {
  let a = lo;
  let b = hi;
  let fa = flo;
  let fb = fhi;
  let side = 0;
  let x = a;
  let fx = fa;
  for (let i = 0; i < maxIter; i++) {
    // Infinite ends (infeasible) fall back to bisection.
    x = Number.isFinite(fa) && Number.isFinite(fb) ? (a * fb - b * fa) / (fb - fa) : (a + b) / 2;
    if (!(x > Math.min(a, b) && x < Math.max(a, b))) x = (a + b) / 2;
    fx = f(x);
    if (Math.abs(fx) < tol || Math.abs(b - a) < 1e-9) break;
    if (Math.sign(fx) === Math.sign(fb)) {
      b = x;
      fb = fx;
      if (side === -1) fa /= 2;
      side = -1;
    } else {
      a = x;
      fa = fx;
      if (side === 1) fb /= 2;
      side = 1;
    }
  }
  return { x, fx };
}

/** Samples per range: feasibility limits can make the difference non-monotonic, so ends alone can miss a flip. */
export const BREAKEVEN_SAMPLES = 9;

export function breakeven(
  inputs: Inputs,
  ctx: SimContext,
  ranges: KnobRanges,
  knobs = BREAKEVEN_KNOBS,
  kinds: BreakevenKind[] = ['nowVsWait', 'buyVsNever'],
): BreakevenRow[] {
  const rows: BreakevenRow[] = [];
  for (const k of knobs) {
    const { min, max } = ranges[k];
    const current = knobBase(inputs, k);
    for (const kind of kinds) {
      const f = (x: number) => diff(inputs, ctx, k, x, kind);
      const xs = Array.from({ length: BREAKEVEN_SAMPLES }, (_, i) => min + ((max - min) * i) / (BREAKEVEN_SAMPLES - 1));
      const fs = xs.map(f);
      const row: BreakevenRow = { knob: k, kind, min, max, value: null, winsAbove: null, residual: null, alwaysFirst: null };
      // Sign changes between neighbouring samples; report the one nearest the current value.
      let pick = -1;
      for (let i = 0; i + 1 < xs.length; i++) {
        if (!(fs[i] < 0 && fs[i + 1] > 0) && !(fs[i] > 0 && fs[i + 1] < 0)) continue;
        const mid = (xs[i] + xs[i + 1]) / 2;
        if (pick < 0 || Math.abs(mid - current) < Math.abs((xs[pick] + xs[pick + 1]) / 2 - current)) pick = i;
      }
      if (pick < 0) {
        if (fs.every((v) => v > 0)) row.alwaysFirst = true;
        else if (fs.every((v) => v < 0)) row.alwaysFirst = false;
      } else {
        const r = findRoot(f, xs[pick], xs[pick + 1], fs[pick], fs[pick + 1]);
        row.value = r.x;
        row.residual = r.fx;
        row.winsAbove = fs[pick + 1] > 0;
      }
      rows.push(row);
    }
  }
  return rows;
}

// ---------- stress test ----------

export const STRESS_SHIFT_PP = 3;

export interface StressRow {
  strategy: Strategy;
  base: { nw: number; refi: RefiInfo | null; debtFreeMonth: number | null };
  stressed: { nw: number; refi: RefiInfo | null; feasible: boolean; debtFreeMonth: number | null };
}

/** Follow-up rate +3 pp at every refinancing (≈ the 2021→2023 jump). */
export function stressTest(inputs: Inputs, ctx: SimContext, strategies: Strategy[], baseModel?: Model): StressRow[] {
  const m0 = baseModel ?? prepare(inputs, ctx);
  const m1 = prepare(inputs, ctx, { followUpShift: STRESS_SHIFT_PP });
  return strategies.map((s) => {
    const a = simulate(m0, s, { extend: true });
    const b = simulate(m1, s, { extend: true });
    return {
      strategy: s,
      base: { nw: a.nw, refi: a.firstRefi, debtFreeMonth: a.debtFreeMonth },
      stressed: { nw: b.nw, refi: b.firstRefi, feasible: b.feasible, debtFreeMonth: b.debtFreeMonth },
    };
  });
}
