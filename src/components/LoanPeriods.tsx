import { useId, useState } from 'react';
import { useStore } from '../state/store';
import { Card } from './Card';
import { useView } from './view';

type Line = 'now' | 'later';

/** The loan as a chain of fixed-rate periods: the purchase loan, then one refinancing per Zinsbindung until repaid. */
export function LoanPeriods() {
  const { t, fmt, real, monthLabel } = useView();
  const primary = useStore((s) => s.results.primary);
  const fixYears = useStore((s) => s.inputs.mortgage.fixationYears);
  const [line, setLine] = useState<Line>('later');
  const selId = useId();
  if (!primary) return null;
  const options: { id: Line; label: string }[] = [
    { id: 'now', label: t('legend.now') },
    {
      id: 'later',
      label: primary.laterCell ? t('legend.later', { date: monthLabel(primary.laterCell.month) }) : t('legend.laterShort'),
    },
  ];
  const res = primary[line];
  const loan = res?.feasible && res.purchase ? res.purchase.loan : 0;
  const periods = res?.feasible ? (res.loanPeriods ?? []) : [];
  const last = periods[periods.length - 1];
  const beyond = periods.some((p) => p.start >= primary.N);
  const sum = (k: 'interest' | 'principal') => periods.reduce((a, p) => a + p[k], 0);

  let body;
  if (!res || !res.feasible) body = <p className="hint">{t('kpi.noPurchase')}</p>;
  else if (loan <= 0) body = <p className="hint">{t('periods.cash')}</p>;
  else
    body = (
      <>
        <div className="table-wrap">
          <table className="data-table periods-table">
            <thead>
              <tr>
                <th>{t('periods.loan')}</th>
                <th>{t('periods.dates')}</th>
                <th className="num">{t('periods.balance')}</th>
                <th className="num">{t('periods.rate')}</th>
                <th className="num">{t('periods.payment')}</th>
                <th className="num">{t('periods.interest')}</th>
                <th className="num">{t('periods.principal')}</th>
                <th className="num">{t('periods.balanceEnd')}</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p, k) => (
                <tr key={p.start} className={p.start >= primary.N ? 'is-beyond' : undefined}>
                  <th scope="row">{k === 0 ? t('periods.first') : t('periods.refi', { n: k })}</th>
                  <td>
                    {monthLabel(p.start)} – {monthLabel(p.end)}
                  </td>
                  <td className="num">{fmt.eur(p.balance)}</td>
                  <td className="num">{fmt.pctDec(p.rateEff, 2)}</td>
                  <td className="num">{fmt.eur(p.payment)}</td>
                  <td className="num">{fmt.eur(p.interest)}</td>
                  <td className="num">{fmt.eur(p.principal)}</td>
                  <td className="num">{p.balanceEnd > 0 ? fmt.eur(p.balanceEnd) : t('periods.paidOff')}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={5}>
                  {t('periods.total')}
                </th>
                <td className="num">{fmt.eur(sum('interest'))}</td>
                <td className="num">{fmt.eur(sum('principal'))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        {last && last.balanceEnd > 0 && <p className="hint">{t('periods.notRepaid')}</p>}
        {beyond && <p className="hint">{t('periods.beyond', { year: primary.horizonYear })}</p>}
        {real && <p className="hint">{t('periods.nominal')}</p>}
      </>
    );

  return (
    <Card k="chart.loanPeriods">
      <p className="hint">{t('periods.summary', { years: fixYears })}</p>
      <div className="field-inline no-print">
        <label htmlFor={selId}>{t('yearly.strategy')}</label>
        <select id={selId} className="select" value={line} onChange={(e) => setLine(e.target.value as Line)}>
          {options.map((o) => (
            <option key={o.id} value={o.id} disabled={!primary[o.id]?.feasible}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <p className="print-only">{options.find((o) => o.id === line)?.label}</p>
      {body}
    </Card>
  );
}
