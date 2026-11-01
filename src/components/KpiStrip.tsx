import type { ReactNode } from 'react';
import { netLost, type SimResult } from '../engine';
import { useStore } from '../state/store';
import { HelpTip } from './HelpTip';
import { useView } from './view';

function Kpi({ k, value, sub, accent }: { k: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  const { t } = useView();
  const text = typeof value === 'string' ? value : undefined;
  return (
    <div className="kpi" style={accent ? { ['--kpi-accent' as string]: accent } : undefined}>
      <div className="kpi-label">
        {t(`help.${k}.title`)} <HelpTip k={k} value={text} />
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

export function KpiStrip() {
  const v = useView();
  const { t, fmt, real, monthLabel, when } = v;
  const primary = useStore((s) => s.results.primary);
  const maxWait = useStore((s) => s.inputs.sim.maxWait);
  if (!primary) return <div className="kpi-strip skeleton">{t('status.computing')}</div>;
  const { grid, now, later, never } = primary;
  const k = real ? 1 / grid.cpiH : 1;
  const best = grid.best;
  const neverWins = !best || grid.never > best.nw;
  const bestNw = neverWins ? grid.never : best.nw;
  const p = later?.purchase ?? null;
  const lost = (r: SimResult | null) => (r && r.feasible ? netLost(r.buckets) * k : NaN);
  const vsBest = (r: SimResult | null) =>
    r && r.feasible ? t('kpi.vsBest', { diff: fmt.eur((r.nw - bestNw) * k, { sign: true }) }) : t('kpi.impossible');

  const debtFree = (() => {
    if (!later || !p) return '–';
    if (p.loan <= 0) return t('kpi.noLoan');
    if (later.debtFreeMonth === null) return t('kpi.notWithin');
    return monthLabel(later.debtFreeMonth);
  })();

  return (
    <div className="kpis">
      <div className="kpi kpi-hero">
        <div className="kpi-label">
          {t('help.kpi.bestMoment.title')} <HelpTip k="kpi.bestMoment" />
        </div>
        {neverWins ? (
          <>
            <div className="kpi-value">{t('kpi.bestMomentKeepRenting')}</div>
            <div className="kpi-sub">{t('kpi.bestMomentKeepRentingSub', { years: maxWait })}</div>
          </>
        ) : (
          <>
            <div className="kpi-value">{monthLabel(best.month)}</div>
            <div className="kpi-sub">
              {when(best.month)} · {t('kpi.atLtv', { ltv: fmt.pctDec(best.ltv, 0) })}
            </div>
          </>
        )}
      </div>

      {later && p ? (
        <div className="kpi-group">
          <div className="kpi-group-title">
            <span className="swatch" style={{ background: 'var(--series-later)' }} />
            {t('kpi.forSelected', { date: monthLabel(p.month) })}
          </div>
          <div className="kpi-grid">
            <Kpi k="kpi.downPayment" value={fmt.eur(p.cashNeeded)} sub={t('kpi.fees', { fees: fmt.eur(p.fees.total) })} />
            <Kpi k="kpi.ltv" value={fmt.pctDec(p.loan / p.price, 0)} sub={fmt.eur(p.loan)} />
            <Kpi k="kpi.rate" value={p.loan > 0 ? fmt.pctDec(p.rateEff, 2) : t('kpi.noLoan')} />
            <Kpi
              k="kpi.paymentShare"
              value={p.loan > 0 ? fmt.pctDec(p.paymentShare, 0) : '–'}
              sub={p.loan > 0 ? `${fmt.eur(p.payment)} · ${t('kpi.ofIncome')}` : undefined}
            />
            <Kpi k="kpi.totalInterest" value={fmt.eur(later.buckets.interest * k)} />
            <Kpi k="kpi.debtFree" value={debtFree} />
            <Kpi
              k="kpi.marginalRate"
              value={p.marginalRate !== null ? fmt.pctDec(p.marginalRate, 2) : '–'}
              sub={t('kpi.lastTenK')}
            />
          </div>
        </div>
      ) : (
        <div className="kpi-group">
          <p className="hint">{t('kpi.noPurchase')}</p>
        </div>
      )}

      <div className="kpi-grid kpi-netlost">
        <Kpi k="kpi.netLostNow" value={fmt.eur(lost(now))} sub={vsBest(now)} accent="var(--series-now)" />
        <Kpi k="kpi.netLostLater" value={fmt.eur(lost(later))} sub={vsBest(later)} accent="var(--series-later)" />
        <Kpi k="kpi.netLostNever" value={fmt.eur(lost(never))} sub={vsBest(never)} accent="var(--series-never)" />
      </div>
    </div>
  );
}
