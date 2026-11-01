import { useId, useState } from 'react';
import type { YearRow } from '../engine';
import { useStore } from '../state/store';
import type { LineId } from '../worker/protocol';
import { Card } from './Card';
import { useView } from './view';

const COLS: (keyof YearRow)[] = ['budget', 'rent', 'interest', 'principal', 'owner', 'taxes', 'portfolio', 'cash', 'home', 'loan', 'nw'];

/** Text alternative to the charts: flows and balances per year for one strategy. Always expanded in print. */
export function YearlyTable() {
  const { t, fmt, real, monthLabel } = useView();
  const primary = useStore((s) => s.results.primary);
  const [open, setOpen] = useState(false);
  const [line, setLine] = useState<LineId>('later');
  const selId = useId();
  if (!primary) return null;
  const options: { id: LineId; label: string }[] = [
    { id: 'now', label: t('legend.now') },
    {
      id: 'later',
      label: primary.laterCell ? t('legend.later', { date: monthLabel(primary.laterCell.month) }) : t('legend.laterShort'),
    },
    { id: 'never', label: t('legend.never') },
  ];
  const res = primary[line] ?? primary.never;
  const years = res.feasible ? (res.years ?? []) : [];
  return (
    <Card
      k="chart.yearly"
      className={`yearly ${open ? 'is-open' : ''}`}
      actions={
        <button type="button" className="btn btn-small no-print" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {open ? t('yearly.hide') : t('yearly.show')}
        </button>
      }
    >
      <div className="yearly-body">
        <div className="field-inline no-print">
          <label htmlFor={selId}>{t('yearly.strategy')}</label>
          <select id={selId} className="select" value={line} onChange={(e) => setLine(e.target.value as LineId)}>
            {options.map((o) => (
              <option key={o.id} value={o.id} disabled={!primary[o.id]?.feasible}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <p className="print-only">{options.find((o) => o.id === line)?.label}</p>
        <div className="table-wrap">
          <table className="data-table yearly-table">
            <thead>
              <tr>
                <th>{t('yearly.year')}</th>
                {COLS.map((c) => (
                  <th key={c} className="num">
                    {t(`yearly.${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year}>
                  <th scope="row">{y.year}</th>
                  {COLS.map((c) => (
                    <td key={c} className="num">
                      {fmt.eur((y[c] as number) / (real ? y.cpi : 1))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
