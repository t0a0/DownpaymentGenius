import { STRESS_SHIFT_PP, type StressRow } from '../engine';
import { useStore } from '../state/store';
import { Card } from './Card';
import { useView } from './view';

type Status = 'good' | 'warning' | 'serious' | 'critical';
const ICON: Record<Status, string> = { good: '✓', warning: '!', serious: '!!', critical: '✕' };

function statusOf(share: number, limit: number): Status {
  if (share <= limit) return 'good';
  if (share <= limit + 0.1) return 'warning';
  if (share <= limit + 0.2) return 'serious';
  return 'critical';
}

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useView();
  return (
    <span className={`status status-${status}`}>
      <span aria-hidden="true">{ICON[status]}</span> {t(`status.${status}`)}
    </span>
  );
}

function StressCard({ row, label, color }: { row: StressRow; label: string; color: string }) {
  const { t, fmt, real, monthLabel } = useView();
  const limit = useStore((s) => s.inputs.mortgage.maxPaymentShare) / 100;
  const cpiH = useStore((s) => s.results.primary?.grid.cpiH ?? 1);
  const k = real ? 1 / cpiH : 1;
  const a = row.base.refi;
  const b = row.stressed.refi;
  const head = (
    <div className="stress-head">
      <span className="swatch" style={{ background: color }} />
      {label}
    </div>
  );
  if (!a || !b) {
    return (
      <div className="stress-card">
        {head}
        <p className="hint">{t('stress.none')}</p>
      </div>
    );
  }
  const status = row.stressed.feasible ? statusOf(b.paymentShare, limit) : 'critical';
  const df = (m: number | null) => (m === null ? t('kpi.notWithin') : monthLabel(m));
  return (
    <div className="stress-card">
      {head}
      <p>{t('stress.refiAt', { date: monthLabel(a.month), balance: fmt.eur(a.balance) })}</p>
      <ul className="plain">
        <li>{t('stress.rate', { base: fmt.pctDec(a.rateEff, 2), stressed: fmt.pctDec(b.rateEff, 2) })}</li>
        <li>
          {t('stress.payment', { base: fmt.eur(a.paymentAfter), stressed: fmt.eur(b.paymentAfter) })} ·{' '}
          {t('stress.share', { share: fmt.pctDec(b.paymentShare, 0) })} <StatusBadge status={status} />
        </li>
        <li>{t('stress.debtFree', { base: df(row.base.debtFreeMonth), stressed: df(row.stressed.debtFreeMonth) })}</li>
        <li>
          {row.stressed.feasible
            ? t('stress.nw', { delta: fmt.eur((row.stressed.nw - row.base.nw) * k, { sign: true }) })
            : t('stress.infeasible')}
        </li>
      </ul>
    </div>
  );
}

export function StressPanel() {
  const { t, monthLabel } = useView();
  const scen = useStore((s) => s.results.scenarios);
  const job = useStore((s) => s.results.scenariosJob);
  const requested = useStore((s) => s.results.requested);
  const laterMonth = useStore((s) => s.results.primary?.laterCell?.month);
  return (
    <Card k="chart.stress" stale={job !== requested}>
      <p className="hint">{t('stress.title', { pp: STRESS_SHIFT_PP })}</p>
      {!scen ? (
        <p className="hint">{t('status.computing')}</p>
      ) : (
        <div className="stress-grid">
          {scen.stress.now && <StressCard row={scen.stress.now} label={t('legend.now')} color="var(--series-now)" />}
          {scen.stress.later && laterMonth !== undefined && (
            <StressCard row={scen.stress.later} label={t('legend.later', { date: monthLabel(laterMonth) })} color="var(--series-later)" />
          )}
        </div>
      )}
    </Card>
  );
}
