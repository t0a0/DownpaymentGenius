import { useMemo } from 'react';
import { calendar, INFEASIBLE_CODES, type GridResult } from '../engine';
import { useT } from '../i18n/useT';
import { useStore } from '../state/store';

/** Shared formatting for result components: month labels, real/nominal scaling. */
export function useView() {
  const { t, fmt, lang } = useT();
  const ctx = useStore((s) => s.ctx);
  const real = useStore((s) => s.inputs.sim.real);
  return useMemo(() => {
    const monthLabel = (m: number) => {
      const c = calendar(ctx, m);
      return fmt.month(c.year, c.month);
    };
    const when = (m: number) => (m <= 0 ? t('kpi.now') : t('kpi.inTime', { d: fmt.duration(m) }));
    return { t, fmt, lang, ctx, real, monthLabel, when };
  }, [t, fmt, lang, ctx, real]);
}

/** Distinct infeasibility reasons across all LTV rows of one grid month. */
export function reasonsAt(g: GridResult, monthIdx: number): string[] {
  const set = new Set<string>();
  for (const row of g.reason) if (row[monthIdx] >= 0) set.add(INFEASIBLE_CODES[row[monthIdx]]);
  return [...set];
}

export const isStale = (job: number, requested: number) => job !== requested;
