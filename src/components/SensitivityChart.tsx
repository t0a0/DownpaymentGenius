import { useCallback } from 'react';
import { EChart } from '../charts/EChart';
import { axisStyle, baseOption, legendStyle, type Palette } from '../charts/theme';
import type { Knob, TornadoPoint } from '../engine';
import { useStore } from '../state/store';
import { Card } from './Card';
import { useView } from './view';

/** Tornado: change of the best choice's net worth when one input moves to the ends of its historical range. */
export function SensitivityChart() {
  const v = useView();
  const { t, fmt, real, monthLabel } = v;
  const tr = useStore((s) => s.results.sensitivity);
  const job = useStore((s) => s.results.sensitivityJob);
  const requested = useStore((s) => s.results.requested);
  const cpiH = useStore((s) => s.results.primary?.grid.cpiH ?? 1);

  const build = useCallback(
    (p: Palette) => {
      if (!tr) return {};
      const k = real ? 1 / cpiH : 1;
      const rows = [...tr.rows].reverse();
      const val = (kn: Knob, x: number) => `${fmt.num(x, kn === 'savings' ? 0 : 2)} ${t(`knob.unit.${kn}`)}`;
      const best = (pt: TornadoPoint) => (pt.bestMonth === null ? t('tornado.never') : monthLabel(pt.bestMonth));
      const mk = (end: 'low' | 'high') =>
        rows.map((r) => {
          const d = (r[end].nw - tr.baseNw) * k;
          return { value: d, itemStyle: { borderRadius: d < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] } };
        });
      return {
        ...baseOption(p),
        grid: { left: 8, right: 24, top: 36, bottom: 24 },
        legend: {
          ...legendStyle(p),
          top: 0,
          left: 0,
          data: [
            { name: t('tornado.low'), itemStyle: { color: p.tornadoLow } },
            { name: t('tornado.high'), itemStyle: { color: p.tornadoHigh } },
          ],
        },
        tooltip: {
          ...baseOption(p).tooltip,
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(127,127,127,0.08)' } },
          formatter: (items: { dataIndex: number }[]) => {
            const r = rows[items[0]?.dataIndex ?? 0];
            const line = (end: 'low' | 'high') =>
              `<div class="tt-row">${t(`tornado.${end}`)} ${val(r.knob, r[end].value)}<b>${fmt.eur((r[end].nw - tr.baseNw) * k, { sign: true })}</b></div><div class="tt-sub">${t('tornado.bestMonth', { when: best(r[end]) })}</div>`;
            return `<div class="tt-title">${t(`knob.${r.knob}`)}</div>${line('low')}${line('high')}`;
          },
        },
        xAxis: {
          type: 'value',
          ...axisStyle(p),
          axisLabel: { ...axisStyle(p).axisLabel, formatter: (x: number) => fmt.eurCompact(x) },
        },
        yAxis: {
          type: 'category',
          data: rows.map((r) => `${t(`knob.${r.knob}`)}\n${val(r.knob, r.low.value)} … ${val(r.knob, r.high.value)}`),
          ...axisStyle(p),
          axisTick: { show: false },
          axisLabel: { ...axisStyle(p).axisLabel, color: p.textSecondary, lineHeight: 16 },
          splitLine: { show: false },
        },
        series: [
          { type: 'bar', name: t('tornado.low'), data: mk('low'), barGap: '10%', itemStyle: { color: p.tornadoLow } },
          { type: 'bar', name: t('tornado.high'), data: mk('high'), itemStyle: { color: p.tornadoHigh } },
        ],
      };
    },
    [tr, real, cpiH, t, fmt, monthLabel],
  );

  const k = real ? 1 / cpiH : 1;
  return (
    <Card k="chart.tornado" stale={job !== requested}>
      {!tr ? (
        <p className="hint">{t('status.computing')}</p>
      ) : (
        <>
          <p className="hint">
            {t('tornado.base', { value: fmt.eur(tr.baseNw * k) })} ·{' '}
            {t('tornado.bestMonth', { when: tr.baseMonth === null ? t('tornado.never') : monthLabel(tr.baseMonth) })}
          </p>
          <EChart build={build} height={tr.rows.length * 52 + 70} ariaLabel={t('help.chart.tornado.title')} />
          <p className="hint">{t('tornado.note')}</p>
        </>
      )}
    </Card>
  );
}
