// Grid search over buy month × LTV. All strategies with the same buy month share the renting path up to that
// month, so the renter state is advanced once and cloned for each LTV.

import type { Model } from './model';
import { TIER_EDGES } from './rates';
import { finalize, initState, runMonths } from './simulate';
import { INFEASIBLE_CODES, type GridCellRef, type GridResult } from './types';

const round6 = (x: number) => Math.round(x * 1e6) / 1e6;

/** LTV rows (loan ÷ price): 0..max in `step`, plus the loans that land exactly on each tier edge. */
export function ltvGrid(m: Model, step = 0.05): number[] {
  const maxShare = m.maxLtv * m.rates.bwFactor;
  const set = new Set<number>();
  const n = Math.floor(maxShare / step + 1e-9);
  for (let i = 0; i <= n; i++) set.add(round6(i * step));
  if (m.rates.bwFactor < 1) {
    for (const e of [...TIER_EDGES, 1.1]) {
      const x = e * m.rates.bwFactor;
      if (x <= maxShare + 1e-9) set.add(round6(x));
    }
  }
  return [...set].sort((a, b) => a - b);
}

export function buyMonths(m: Model, step = 1): number[] {
  const out: number[] = [];
  for (let b = 0; b <= m.maxBuy; b += step) out.push(b);
  return out;
}

export interface OptimizeOptions {
  monthStep?: number;
  ltvStep?: number;
  ltvs?: number[];
}

export function optimize(m: Model, opts: OptimizeOptions = {}): GridResult {
  const months = buyMonths(m, opts.monthStep ?? 1);
  const ltvs = opts.ltvs ?? ltvGrid(m, opts.ltvStep ?? 0.05);
  const nw = ltvs.map(() => new Float64Array(months.length).fill(NaN));
  const reason = ltvs.map(() => new Int8Array(months.length).fill(-1));

  const renter = initState(m);
  let cur = 0;
  for (let j = 0; j < months.length; j++) {
    const b = months[j];
    runMonths(m, renter, cur, b, -1, 0);
    cur = b;
    for (let i = 0; i < ltvs.length; i++) {
      const s = renter.clone();
      runMonths(m, s, b, m.N, b, ltvs[i]);
      if (s.dead) reason[i][j] = INFEASIBLE_CODES.indexOf(s.dead);
      else nw[i][j] = finalize(m, s);
    }
  }
  runMonths(m, renter, cur, m.N, -1, 0);
  const never = finalize(m, renter);

  const bestLtvIdx = new Int16Array(months.length).fill(-1);
  const timing = new Float64Array(months.length).fill(NaN);
  let best: GridCellRef | null = null;
  let bestWait: GridCellRef | null = null;
  for (let j = 0; j < months.length; j++) {
    let bi = -1;
    for (let i = 0; i < ltvs.length; i++) {
      const v = nw[i][j];
      if (!Number.isNaN(v) && (bi < 0 || v > nw[bi][j])) bi = i;
    }
    bestLtvIdx[j] = bi;
    if (bi < 0) continue;
    const v = nw[bi][j];
    timing[j] = v;
    const cell = { month: months[j], ltv: ltvs[bi], nw: v };
    if (!best || v > best.nw) best = cell;
    if (months[j] > 0 && (!bestWait || v > bestWait.nw)) bestWait = cell;
  }
  const buyNow = bestLtvIdx[0] >= 0 ? { month: 0, ltv: ltvs[bestLtvIdx[0]], nw: timing[0] } : null;
  return {
    months,
    ltvs,
    nw,
    reason,
    bestLtvIdx,
    timing,
    best,
    buyNow,
    bestWait,
    never,
    cpiH: m.cpi[m.N],
    moneyIn: m.moneyIn,
  };
}

/** Best LTV at a given buy month (nearest grid month), or null if none is feasible. */
export function bestAtMonth(g: GridResult, month: number): GridCellRef | null {
  let j = 0;
  for (let k = 0; k < g.months.length; k++) if (Math.abs(g.months[k] - month) < Math.abs(g.months[j] - month)) j = k;
  const i = g.bestLtvIdx[j];
  return i < 0 ? null : { month: g.months[j], ltv: g.ltvs[i], nw: g.timing[j] };
}
