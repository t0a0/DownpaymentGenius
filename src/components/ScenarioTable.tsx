import { useStore } from '../state/store';
import { Card } from './Card';
import { useView } from './view';

const COLOR = { now: 'var(--series-now)', later: 'var(--series-later)', never: 'var(--series-never)' };

export function ScenarioTable() {
  const { t, fmt, real, monthLabel } = useView();
  const scen = useStore((s) => s.results.scenarios);
  const job = useStore((s) => s.results.scenariosJob);
  const requested = useStore((s) => s.results.requested);
  const primary = useStore((s) => s.results.primary);
  if (!scen || !primary) {
    return (
      <Card k="chart.scenarios">
        <p className="hint">{t('status.computing')}</p>
      </Card>
    );
  }
  const k = real ? 1 / primary.grid.cpiH : 1;
  const lineName = (id: 'now' | 'later' | 'never') =>
    id === 'later' && primary.laterCell ? t('legend.later', { date: monthLabel(primary.laterCell.month) }) : t(`legend.${id}`);
  return (
    <Card k="chart.scenarios" stale={job !== requested}>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>{t('scenario.colScenario')}</th>
              <th>{t('scenario.colBest')}</th>
              {scen.order.map((id) => (
                <th key={id} className="num">
                  <span className="swatch" style={{ background: COLOR[id] }} /> {lineName(id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scen.result.runs.map((r) => {
              const buyWins = r.best && r.best.nw > r.never;
              return (
                <tr key={r.id}>
                  <th scope="row">
                    {t(`scenario.${r.id}`)}
                    <div className="muted small">{t(`scenario.${r.id}.desc`)}</div>
                  </th>
                  <td>
                    {buyWins && r.best
                      ? `${monthLabel(r.best.month)} · ${fmt.pctDec(r.best.ltv, 0)}`
                      : t('tornado.never')}
                    <div className="muted small">{fmt.eur(Math.max(r.best?.nw ?? -Infinity, r.never) * k)}</div>
                  </td>
                  {r.lines.map((l, i) => (
                    <td key={i} className="num">
                      {Number.isNaN(l.final) ? t('kpi.impossible') : fmt.eur(l.final * k)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
