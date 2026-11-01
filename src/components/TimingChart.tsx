import { useCallback } from 'react';
import { EChart } from '../charts/EChart';
import { alpha, axisStyle, baseOption, legendStyle, type Palette } from '../charts/theme';
import { tierIndex } from '../engine';
import { useStore } from '../state/store';
import { Card } from './Card';
import { reasonsAt, useView } from './view';

const TIER_NAMES = ['≤ 60 %', '≤ 70 %', '≤ 80 %', '≤ 90 %', '≤ 100 %', '> 100 %'];

export function TimingChart() {
  const v = useView();
  const { t, fmt, real, monthLabel, when } = v;
  const results = useStore((s) => s.results);
  const bwDiscount = useStore((s) => s.inputs.mortgage.bwDiscount);
  const setSelection = useStore((s) => s.setSelection);
  const primary = results.primary;
  const stale = results.primaryJob !== results.requested;

  const build = useCallback(
    (p: Palette) => {
      if (!primary) return {};
      const g = primary.grid;
      const k = real ? 1 / g.cpiH : 1;
      const labels = g.months.map((m) => monthLabel(m));
      const data = Array.from(g.timing, (x) => (Number.isNaN(x) ? '-' : x * k));
      const bw = 1 - bwDiscount / 100;
      // Shade runs of months by the tier of their best LTV, and grey out months with no feasible purchase.
      const areas: unknown[] = [];
      let start = 0;
      const keyAt = (j: number) => (g.bestLtvIdx[j] < 0 ? -1 : tierIndex(g.ltvs[g.bestLtvIdx[j]] / bw));
      for (let j = 1; j <= g.months.length; j++) {
        if (j < g.months.length && keyAt(j) === keyAt(start)) continue;
        const key = keyAt(start);
        const hasLoan = key >= 0 && g.ltvs[g.bestLtvIdx[start]] > 0;
        areas.push([
          {
            xAxis: start,
            itemStyle: {
              color: key < 0 ? alpha(p.textMuted, 0.18) : alpha(p.accent, hasLoan ? 0.03 + key * 0.025 : 0.02),
            },
            label: {
              show: j - start >= 6,
              color: p.textMuted,
              fontFamily: p.font,
              fontSize: 11,
              position: 'insideBottom',
              formatter: key < 0 ? t('timing.infeasible') : hasLoan ? TIER_NAMES[key] : '0 %',
            },
          },
          { xAxis: Math.min(j, g.months.length - 1) },
        ]);
        start = j;
      }
      const sel = primary.laterCell ? g.months.indexOf(primary.laterCell.month) : -1;
      const bestJ = g.best ? g.months.indexOf(g.best.month) : -1;
      return {
        ...baseOption(p),
        grid: { left: 8, right: 16, top: 52, bottom: 24 },
        legend: {
          ...legendStyle(p),
          top: 0,
          left: 0,
          data: [
            { name: t('legend.laterShort'), itemStyle: { color: p.later } },
            { name: t('legend.never'), itemStyle: { color: p.never } },
          ],
        },
        tooltip: {
          ...baseOption(p).tooltip,
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: p.axis } },
          formatter: (items: { dataIndex: number }[]) => {
            const j = items[0]?.dataIndex ?? 0;
            const m = g.months[j];
            const head = `<div class="tt-title">${monthLabel(m)} · ${when(m)}</div>`;
            if (g.bestLtvIdx[j] < 0)
              return `${head}${t('timing.infeasible')}: ${reasonsAt(g, j).map((r) => t(`reason.${r}`)).join('; ')}`;
            return `${head}<div class="tt-row">${t('axis.netWorthAtH')}<b>${fmt.eur(g.timing[j] * k)}</b></div><div class="tt-row">${t('axis.ltv')}<b>${fmt.pctDec(g.ltvs[g.bestLtvIdx[j]], 0)}</b></div><div class="tt-row">${t('legend.never')}<b>${fmt.eur(g.never * k)}</b></div>`;
          },
        },
        xAxis: {
          type: 'category',
          data: labels,
          boundaryGap: false,
          name: t('axis.buyMonth'),
          nameLocation: 'middle',
          nameGap: 28,
          ...axisStyle(p),
          splitLine: { show: false },
          axisLabel: {
            ...axisStyle(p).axisLabel,
            interval: (i: number) => (v.ctx.startMonth + g.months[i]) % 12 === 0,
            formatter: (_: string, i: number) => String(v.ctx.startYear + Math.floor((v.ctx.startMonth + g.months[i]) / 12)),
          },
        },
        yAxis: {
          type: 'value',
          scale: true,
          ...axisStyle(p),
          axisLabel: { ...axisStyle(p).axisLabel, formatter: (x: number) => fmt.eurPrecise(x) },
        },
        series: [
          {
            type: 'line',
            name: t('legend.laterShort'),
            data,
            symbol: 'none',
            connectNulls: false,
            lineStyle: { width: 2, color: p.later },
            itemStyle: { color: p.later },
            markArea: { silent: true, data: areas },
            markPoint:
              bestJ >= 0
                ? {
                    symbol: 'circle',
                    symbolSize: 10,
                    itemStyle: { color: p.later, borderColor: p.surface, borderWidth: 2 },
                    label: {
                      show: true,
                      position: 'top',
                      color: p.text,
                      fontFamily: p.font,
                      fontSize: 12,
                      formatter: t('chart.best'),
                    },
                    data: [{ coord: [bestJ, g.timing[bestJ] * k] }],
                  }
                : undefined,
            markLine:
              sel >= 0 && sel !== bestJ
                ? {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { color: p.textMuted, width: 1, type: 'solid' },
                    label: { color: p.textMuted, fontFamily: p.font, fontSize: 12, formatter: t('chart.selected') },
                    data: [{ xAxis: sel }],
                  }
                : undefined,
          },
          {
            type: 'line',
            name: t('legend.never'),
            data: g.months.map(() => g.never * k),
            symbol: 'none',
            silent: true,
            lineStyle: { width: 2, color: p.never, type: 'dotted' },
            itemStyle: { color: p.never },
            tooltip: { show: false },
          },
        ],
      };
    },
    [primary, real, t, fmt, monthLabel, when, bwDiscount, v.ctx],
  );

  if (!primary) return null;
  return (
    <Card k="chart.timing" stale={stale}>
      <EChart
        build={build}
        height={300}
        ariaLabel={t('help.chart.timing.title')}
        onClick={(params) => {
          const j = params.dataIndex;
          if (j !== undefined && primary.grid.bestLtvIdx[j] >= 0) setSelection({ month: primary.grid.months[j], ltv: null });
        }}
      />
    </Card>
  );
}
