import { useCallback, useId } from 'react';
import { EChart } from '../charts/EChart';
import { alpha, axisStyle, baseOption, legendStyle, type Palette } from '../charts/theme';
import type { MonthRow, SimResult } from '../engine';
import { useStore } from '../state/store';
import type { LineId } from '../worker/protocol';
import { Card } from './Card';
import { reasonsAt, useView } from './view';

const COLOR: Record<LineId, keyof Palette> = { now: 'now', later: 'later', never: 'never' };

export function NetWorthChart() {
  const v = useView();
  const { t, fmt, real, monthLabel, when } = v;
  const results = useStore((s) => s.results);
  const selection = useStore((s) => s.selection);
  const setSelection = useStore((s) => s.setSelection);
  const sliderId = useId();
  const primary = results.primary;
  const scen = results.scenarios;
  const stale = results.primaryJob !== results.requested;

  const build = useCallback(
    (p: Palette) => {
      if (!primary) return {};
      const N = primary.N;
      const scale = (r: MonthRow) => (real ? r.nw / r.cpi : r.nw);
      const lines: { id: LineId; res: SimResult | null; name: string }[] = [
        { id: 'now', res: primary.now, name: t('legend.now') },
        {
          id: 'later',
          res: primary.later,
          name: primary.laterCell ? t('legend.later', { date: monthLabel(primary.laterCell.month) }) : t('legend.laterShort'),
        },
        { id: 'never', res: primary.never, name: t('legend.never') },
      ];
      const labels = Array.from({ length: N }, (_, i) => monthLabel(i));
      const cpiAt = primary.never.rows!.map((r) => r.cpi);
      const series: unknown[] = [];
      // "Buy at X" coincides with "buy now" when the selection is month 0 with the same loan: draw it once.
      const sameAsNow =
        primary.now && primary.later && primary.later.strategy.buyMonth === 0 && primary.later.strategy.ltv === primary.now.strategy.ltv;
      // Scenario bands: min/max over the named scenarios, drawn as a stacked area below each line.
      if (scen) {
        scen.order.forEach((id, k) => {
          const band = scen.result.bands[k];
          if (!band || (id === 'later' && sameAsNow)) return;
          const lo = Array.from(band.lo, (x, i) => (Number.isNaN(x) ? '-' : real ? x / cpiAt[i] : x));
          const diff = Array.from(band.hi, (x, i) =>
            Number.isNaN(x) || Number.isNaN(band.lo[i]) ? '-' : real ? (x - band.lo[i]) / cpiAt[i] : x - band.lo[i],
          );
          const color = p[COLOR[id]] as string;
          const common = { type: 'line', stack: `band-${id}`, symbol: 'none', silent: true, lineStyle: { opacity: 0 }, tooltip: { show: false } };
          series.push({ ...common, name: `${id}-lo`, data: lo, legendHoverLink: false });
          series.push({
            ...common,
            name: t('legend.band'),
            data: diff,
            areaStyle: { color: alpha(color, 0.15) },
          });
        });
      }
      // End labels of lines that finish close together are spread vertically so they stay readable.
      const drawn = lines.filter((l) => l.res?.feasible && l.res.rows && !(l.id === 'later' && sameAsNow));
      const finalOf = (l: (typeof lines)[number]) => scale(l.res!.rows![l.res!.rows!.length - 1]);
      const top = Math.max(...drawn.map((l) => Math.abs(finalOf(l))), 1);
      const order = [...drawn].sort((a, b) => finalOf(b) - finalOf(a));
      const offset = new Map<LineId, number>();
      order.forEach((l, i) => {
        const near = order.some((o) => o !== l && Math.abs(finalOf(o) - finalOf(l)) < 0.06 * top);
        offset.set(l.id, near ? (i - (order.length - 1) / 2) * 14 : 0);
      });
      for (const l of drawn) {
        const color = p[COLOR[l.id]] as string;
        const data = new Array<number | string>(N).fill('-');
        const res = l.res!;
        for (const r of res.rows!) data[r.t] = scale(r);
        const pm = l.id === 'later' ? res.purchase?.month : undefined;
        series.push({
          type: 'line',
          name: l.name,
          data,
          symbol: 'none',
          showSymbol: false,
          lineStyle: { width: 2, color, type: l.id === 'never' ? 'dotted' : 'solid' },
          itemStyle: { color },
          endLabel: {
            show: true,
            offset: [4, offset.get(l.id) ?? 0],
            color: p.textSecondary,
            fontFamily: p.font,
            fontSize: 12,
            formatter: () => l.name,
          },
          markLine:
            pm !== undefined && pm > 0
              ? {
                  silent: true,
                  symbol: 'none',
                  lineStyle: { color: p.textMuted, width: 1, type: 'solid' },
                  label: { color: p.textMuted, fontFamily: p.font, fontSize: 12, formatter: t('chart.purchase'), position: 'insideEndTop' },
                  data: [{ xAxis: pm }],
                }
              : undefined,
        });
      }
      return {
        ...baseOption(p),
        // room for the end labels; less on phones
        grid: { left: 8, right: window.innerWidth < 600 ? 84 : 120, top: 40, bottom: 24 },
        legend: {
          ...legendStyle(p),
          top: 0,
          left: 0,
          data: [
            ...lines
              .filter((l) => l.res?.feasible && !(l.id === 'later' && sameAsNow))
              .map((l) => ({ name: l.name, itemStyle: { color: p[COLOR[l.id]] as string } })),
            ...(scen ? [{ name: t('legend.band'), itemStyle: { color: alpha(p.accent, 0.25) } }] : []),
          ],
        },
        tooltip: {
          ...baseOption(p).tooltip,
          trigger: 'axis',
          axisPointer: { type: 'line', lineStyle: { color: p.axis } },
          formatter: (items: { seriesName: string; value: number | string; color: string; axisValue: string }[]) => {
            const rows = items
              .filter((i) => lines.some((l) => l.name === i.seriesName) && typeof i.value === 'number')
              .map(
                (i) =>
                  `<div class="tt-row"><span class="tt-dot" style="background:${i.color}"></span>${i.seriesName}<b>${fmt.eur(i.value as number)}</b></div>`,
              );
            return `<div class="tt-title">${items[0]?.axisValue ?? ''}</div>${rows.join('')}`;
          },
        },
        xAxis: {
          type: 'category',
          data: labels,
          boundaryGap: false,
          ...axisStyle(p),
          splitLine: { show: false },
          axisLabel: {
            ...axisStyle(p).axisLabel,
            interval: (i: number) => (v.ctx.startMonth + i) % 12 === 0 && (Math.floor((v.ctx.startMonth + i) / 12) + v.ctx.startYear) % 5 === 0,
            formatter: (_: string, i: number) => String(v.ctx.startYear + Math.floor((v.ctx.startMonth + i) / 12)),
          },
        },
        yAxis: {
          type: 'value',
          ...axisStyle(p),
          axisLabel: { ...axisStyle(p).axisLabel, formatter: (x: number) => fmt.eurCompact(x) },
        },
        series,
      };
    },
    [primary, scen, real, t, fmt, monthLabel, v.ctx],
  );

  if (!primary) return null;
  const laterMonth = primary.laterCell?.month ?? 0;
  const noNowReason = !primary.now ? reasonsAt(primary.grid, 0).map((r) => t(`reason.${r}`)).join('; ') : null;

  return (
    <Card k="chart.netWorth" stale={stale}>
      <p className="hint chart-unit">{real ? t('chart.real') : t('chart.nominal')}</p>
      <EChart build={build} height={340} ariaLabel={t('help.chart.netWorth.title')} />
      <div className="buyin no-print">
        <label htmlFor={sliderId}>{t('slider.buyIn')}</label>
        <input
          id={sliderId}
          type="range"
          className="slider"
          min={0}
          max={primary.maxBuy}
          step={1}
          value={laterMonth}
          style={{ ['--fill' as string]: `${(laterMonth / (primary.maxBuy || 1)) * 100}%` }}
          onChange={(e) => setSelection({ month: Number(e.target.value), ltv: null })}
        />
        <span className="buyin-value">{t('slider.monthLabel', { date: monthLabel(laterMonth), d: when(laterMonth) })}</span>
        <button type="button" className="btn btn-small" disabled={!selection} onClick={() => setSelection(null)}>
          {t('slider.reset')}
        </button>
      </div>
      {noNowReason && <p className="hint">{t('chart.noBuyNow', { reason: noNowReason })}</p>}
      {!primary.later && <p className="hint">{t('chart.noLater')}</p>}
    </Card>
  );
}
