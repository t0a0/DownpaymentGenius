import { useCallback } from 'react';
import { EChart } from '../charts/EChart';
import { axisStyle, baseOption, legendStyle, type Palette } from '../charts/theme';
import { LOST_KEYS, MADE_KEYS, totalLost, totalMade, type SimResult } from '../engine';
import { useStore } from '../state/store';
import type { LineId } from '../worker/protocol';
import { Card } from './Card';
import { useView } from './view';

const ROWS = [...LOST_KEYS, ...MADE_KEYS] as const;

/** One row per bucket: lost to the left of zero, made to the right, one bar per strategy, plus a net marker. */
export function WasteBars() {
  const v = useView();
  const { t, fmt, real, monthLabel } = v;
  const results = useStore((s) => s.results);
  const primary = results.primary;
  const stale = results.primaryJob !== results.requested;

  const build = useCallback(
    (p: Palette) => {
      if (!primary) return {};
      const k = real ? 1 / primary.grid.cpiH : 1;
      const all: { id: LineId; res: SimResult | null; name: string; color: string }[] = [
        { id: 'now', res: primary.now, name: t('legend.now'), color: p.now },
        {
          id: 'later',
          res: primary.later,
          name: primary.laterCell ? t('legend.later', { date: monthLabel(primary.laterCell.month) }) : t('legend.laterShort'),
          color: p.later,
        },
        { id: 'never', res: primary.never, name: t('legend.never'), color: p.never },
      ];
      const lines = all.filter((l) => l.res?.feasible);
      // Category axis runs bottom-up, so reverse to list buckets top-down with the net row last.
      const cats = [...ROWS.map((r) => t(`bucket.${r}`)), t('bucket.net')].reverse();
      const n = cats.length;
      const series: unknown[] = [];
      for (const l of lines) {
        const b = l.res!.buckets;
        const data = new Array<unknown>(n).fill('-');
        ROWS.forEach((key, r) => {
          const raw = (LOST_KEYS as readonly string[]).includes(key) ? -b[key] : b[key];
          const val = raw * k;
          data[n - 1 - r] = {
            value: val,
            itemStyle: { borderRadius: val < 0 ? [4, 0, 0, 4] : [0, 4, 4, 0] },
          };
        });
        series.push({
          type: 'bar',
          name: l.name,
          data,
          barGap: '20%',
          barCategoryGap: '28%',
          itemStyle: { color: l.color, borderColor: p.surface, borderWidth: 1 },
        });
        const net = (totalMade(b) - totalLost(b)) * k;
        const marker = new Array<unknown>(n).fill('-');
        marker[0] = net;
        series.push({
          type: 'scatter',
          name: l.name,
          data: marker,
          symbol: 'diamond',
          symbolSize: 14,
          itemStyle: { color: l.color, borderColor: p.surface, borderWidth: 1.5 },
          z: 5,
        });
      }
      return {
        ...baseOption(p),
        grid: { left: 8, right: 24, top: 36, bottom: 8 },
        legend: { ...legendStyle(p), top: 0, left: 0, data: lines.map((l) => ({ name: l.name, itemStyle: { color: l.color } })) },
        tooltip: {
          ...baseOption(p).tooltip,
          trigger: 'axis',
          axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(127,127,127,0.08)' } },
          formatter: (items: { seriesName: string; value: number | string | { value: number }; color: string; axisValue: string }[]) => {
            const rows = items
              .map((i) => ({ ...i, v: typeof i.value === 'object' ? i.value.value : i.value }))
              .filter((i) => typeof i.v === 'number')
              .map(
                (i) =>
                  `<div class="tt-row"><span class="tt-dot" style="background:${i.color}"></span>${i.seriesName}<b>${fmt.eur(i.v as number, { sign: true })}</b></div>`,
              );
            return `<div class="tt-title">${items[0]?.axisValue ?? ''}</div>${rows.join('')}`;
          },
        },
        xAxis: {
          type: 'value',
          ...axisStyle(p),
          axisLabel: { ...axisStyle(p).axisLabel, formatter: (x: number) => fmt.eurCompact(x) },
          name: `${t('waste.lost')}   ${t('waste.made')}`,
          nameLocation: 'middle',
          nameGap: 26,
        },
        yAxis: {
          type: 'category',
          data: cats,
          ...axisStyle(p),
          axisTick: { show: false },
          axisLabel: { ...axisStyle(p).axisLabel, color: p.textSecondary },
          splitLine: { show: false },
        },
        series,
      };
    },
    [primary, real, t, fmt, monthLabel],
  );

  if (!primary) return null;
  return (
    <Card k="chart.waste" stale={stale}>
      <EChart build={build} height={440} ariaLabel={t('help.chart.waste.title')} />
    </Card>
  );
}
