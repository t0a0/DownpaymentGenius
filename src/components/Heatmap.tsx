import { useCallback } from 'react';
import { EChart } from '../charts/EChart';
import { axisStyle, baseOption, type Palette } from '../charts/theme';
import { INFEASIBLE_CODES, TIER_EDGES } from '../engine';
import { useStore } from '../state/store';
import { Card } from './Card';
import { useView } from './view';

export function Heatmap() {
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
      const feasible: [number, number, number][] = [];
      const blocked: [number, number, number][] = [];
      let lo = Infinity;
      let hi = -Infinity;
      g.ltvs.forEach((_, i) =>
        g.months.forEach((_, j) => {
          const x = g.nw[i][j];
          if (Number.isNaN(x)) blocked.push([j, i, g.reason[i][j]]);
          else {
            feasible.push([j, i, x * k]);
            lo = Math.min(lo, x * k);
            hi = Math.max(hi, x * k);
          }
        }),
      );
      const ring: [number, number, number][] = [];
      if (g.best) ring.push([g.months.indexOf(g.best.month), g.ltvs.indexOf(g.best.ltv), 0]);
      if (primary.laterCell) ring.push([g.months.indexOf(primary.laterCell.month), g.ltvs.indexOf(primary.laterCell.ltv), 1]);
      // Tier edges sit between rows: the row just above an edge is the first row of the next tier.
      const bw = 1 - bwDiscount / 100;
      const edgeRows = new Set(
        TIER_EDGES.map((e) => g.ltvs.findIndex((x) => x / bw > e + 1e-9)).filter((i) => i > 0),
      );
      return {
        ...baseOption(p),
        grid: { left: 8, right: 16, top: 16, bottom: 64 },
        tooltip: {
          ...baseOption(p).tooltip,
          formatter: (it: { value: [number, number, number]; seriesIndex: number }) => {
            const [j, i, val] = it.value;
            const head = `<div class="tt-title">${monthLabel(g.months[j])} · ${when(g.months[j])}</div><div class="tt-row">${t('axis.ltv')}<b>${fmt.pctDec(g.ltvs[i], 0)}</b></div>`;
            if (it.seriesIndex === 1) return `${head}${t('timing.infeasible')}: ${t(`reason.${INFEASIBLE_CODES[val]}`)}`;
            return `${head}<div class="tt-row">${t('axis.netWorthAtH')}<b>${fmt.eur(g.nw[i][j] * k)}</b></div>`;
          },
        },
        xAxis: {
          type: 'category',
          data: g.months.map((m) => monthLabel(m)),
          name: t('axis.buyMonth'),
          nameLocation: 'middle',
          nameGap: 26,
          ...axisStyle(p),
          splitLine: { show: false },
          axisLabel: {
            ...axisStyle(p).axisLabel,
            interval: (i: number) => (v.ctx.startMonth + g.months[i]) % 12 === 0,
            formatter: (_: string, i: number) => String(v.ctx.startYear + Math.floor((v.ctx.startMonth + g.months[i]) / 12)),
          },
        },
        yAxis: {
          type: 'category',
          data: g.ltvs.map((x) => fmt.pctDec(x, x * 100 === Math.round(x * 100) ? 0 : 1)),
          name: t('axis.ltv'),
          ...axisStyle(p),
          axisLabel: { ...axisStyle(p).axisLabel, interval: (i: number) => i % 2 === 0 || edgeRows.has(i) },
          splitLine: {
            show: true,
            interval: (i: number) => edgeRows.has(i),
            lineStyle: { color: p.axis, width: 1 },
          },
        },
        // Every heatmap series needs a visualMap; the blocked and ring layers get fixed-colour hidden ones.
        visualMap: [
          {
            seriesIndex: 0,
            min: Number.isFinite(lo) ? lo : 0,
            max: Number.isFinite(hi) ? hi : 1,
            calculable: false,
            orient: 'horizontal',
            left: 'center',
            bottom: 0,
            itemWidth: 12,
            itemHeight: 180,
            text: [t('heatmap.legendBetter'), t('heatmap.legendWorse')],
            textStyle: { color: p.textSecondary, fontFamily: p.font, fontSize: 12 },
            inRange: { color: p.heat },
            formatter: (x: number) => fmt.eurPrecise(x),
          },
          { show: false, seriesIndex: 1, min: 0, max: 3, inRange: { color: [p.grid, p.grid] } },
          { show: false, seriesIndex: 2, min: 0, max: 1, inRange: { color: ['rgba(0,0,0,0)', 'rgba(0,0,0,0)'] } },
        ],
        series: [
          {
            type: 'heatmap',
            data: feasible,
            emphasis: { itemStyle: { borderColor: p.text, borderWidth: 1 } },
          },
          {
            type: 'heatmap',
            data: blocked,
            itemStyle: {
              color: p.grid,
              decal: { symbol: 'rect', symbolSize: 1, dashArrayX: [1, 0], dashArrayY: [1, 3], rotation: Math.PI / 4, color: p.axis },
            },
            emphasis: { disabled: true },
          },
          {
            type: 'heatmap',
            data: ring,
            silent: true,
            tooltip: { show: false },
            itemStyle: { color: 'transparent', borderColor: p.text, borderWidth: 2 },
            label: {
              show: false,
            },
          },
        ],
      };
    },
    [primary, real, t, fmt, monthLabel, when, bwDiscount, v.ctx],
  );

  if (!primary) return null;
  const g = primary.grid;
  return (
    <Card k="chart.heatmap" stale={stale}>
      <EChart
        build={build}
        height={Math.max(300, g.ltvs.length * 14 + 110)}
        ariaLabel={t('help.chart.heatmap.title')}
        onClick={(params) => {
          if (params.seriesIndex !== 0) return;
          const [j, i] = params.value as [number, number, number];
          setSelection({ month: g.months[j], ltv: g.ltvs[i] });
        }}
      />
      <p className="hint">{t('heatmap.hint')}</p>
    </Card>
  );
}
