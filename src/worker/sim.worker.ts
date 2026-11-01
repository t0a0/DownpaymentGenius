// Runs the engine off the main thread. Each request carries a job id; work yields between stages and stops as
// soon as a newer request has arrived, so fast slider drags never produce stale results.

import { RANGES, SCENARIOS } from '../data/history';
import {
  BREAKEVEN_KNOBS,
  bestAtMonth,
  breakeven,
  horizonYearOf,
  optimize,
  prepare,
  scenarios,
  simulate,
  stressTest,
  tornado,
  type BreakevenRow,
  type GridCellRef,
  type GridResult,
  type Model,
  type Strategy,
  type TornadoResult,
} from '../engine';
import type { ComputeRequest, LineId, Selection, WorkerMessage } from './protocol';

// Typed loosely so the worker compiles under the project's DOM lib.
const scope = self as unknown as {
  postMessage(m: WorkerMessage): void;
  onmessage: ((e: MessageEvent<ComputeRequest>) => void) | null;
};

let latest = 0;
let cache: { key: string; model: Model; grid: GridResult; tornado?: TornadoResult; breakeven?: BreakevenRow[] } | null =
  null;

const post = (m: WorkerMessage) => scope.postMessage(m);
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

function pickLater(g: GridResult, sel: Selection | null): GridCellRef | null {
  if (!sel) return g.best;
  if (sel.ltv !== null) {
    const j = g.months.indexOf(sel.month);
    const i = g.ltvs.findIndex((x) => Math.abs(x - sel.ltv!) < 1e-6);
    if (i >= 0 && j >= 0 && !Number.isNaN(g.nw[i][j])) return { month: sel.month, ltv: g.ltvs[i], nw: g.nw[i][j] };
  }
  return bestAtMonth(g, Math.min(sel.month, g.months[g.months.length - 1]));
}

async function run(req: ComputeRequest): Promise<void> {
  const { jobId, inputs, ctx } = req;
  const stale = () => jobId !== latest;
  const key = JSON.stringify([inputs, ctx]);
  if (!cache || cache.key !== key) {
    const model = prepare(inputs, ctx);
    cache = { key, model, grid: optimize(model) };
  }
  const c = cache;
  const { model, grid } = c;

  const laterCell = pickLater(grid, req.selection);
  const sim = (s: Strategy) => simulate(model, s, { record: true, extend: true });
  const now = grid.buyNow ? sim({ buyMonth: 0, ltv: grid.buyNow.ltv }) : null;
  const later = laterCell ? sim({ buyMonth: laterCell.month, ltv: laterCell.ltv }) : null;
  const never = sim({ buyMonth: null, ltv: 0 });
  post({
    type: 'primary',
    jobId,
    data: {
      grid,
      now,
      later,
      never,
      laterCell,
      N: model.N,
      maxBuy: model.maxBuy,
      horizonYear: horizonYearOf(inputs, ctx),
    },
  });

  await tick();
  if (stale()) return;
  const order: LineId[] = [];
  const strategies: Strategy[] = [];
  if (now) {
    order.push('now');
    strategies.push(now.strategy);
  }
  // When "buy at X" is the same strategy as "buy now", scenarios and stress test show it once.
  const laterSame = !!now && !!later && later.strategy.buyMonth === 0 && later.strategy.ltv === now.strategy.ltv;
  if (later && !laterSame) {
    order.push('later');
    strategies.push(later.strategy);
  }
  order.push('never');
  strategies.push(never.strategy);
  const sc = scenarios(inputs, ctx, SCENARIOS, strategies);
  const stressFor = [now, laterSame ? null : later].filter((x) => x !== null);
  const stressRows = stressTest(inputs, ctx, stressFor.map((r) => r.strategy), model);
  const stress: Partial<Record<'now' | 'later', (typeof stressRows)[number]>> = {};
  let k = 0;
  if (now) stress.now = stressRows[k++];
  if (later && !laterSame) stress.later = stressRows[k++];
  post({ type: 'scenarios', jobId, data: { result: sc, order, stress } });

  await tick();
  if (stale()) return;
  if (!c.tornado) c.tornado = tornado(inputs, ctx, RANGES);
  post({ type: 'sensitivity', jobId, data: c.tornado });

  if (!c.breakeven) {
    const rows: BreakevenRow[] = [];
    for (const knob of BREAKEVEN_KNOBS) {
      await tick();
      if (stale()) return;
      rows.push(...breakeven(inputs, ctx, RANGES, [knob]));
    }
    c.breakeven = rows;
  }
  post({ type: 'breakeven', jobId, data: c.breakeven });
}

scope.onmessage = (e) => {
  const req = e.data;
  if (req.type !== 'compute') return;
  latest = req.jobId;
  run(req).catch((err: unknown) => post({ type: 'error', jobId: req.jobId, message: String(err) }));
};
