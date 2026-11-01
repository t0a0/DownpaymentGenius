import { useEffect, useRef } from 'react';
import { echarts, type ChartOption } from './echarts';
import { PRINT_EVENT, readPalette, THEME_EVENT, type Palette } from './theme';

/** Width charts are laid out at while printing (A4 portrait content width). */
const PRINT_WIDTH = 680;

export interface EChartProps {
  /** builds the option from the current palette; memoise it so it only changes with its data */
  build: (p: Palette) => ChartOption;
  height: number;
  ariaLabel: string;
  onClick?: (params: { data?: unknown; dataIndex?: number; seriesIndex?: number; value?: unknown }) => void;
}

/** A chart that fails to render must not take the rest of the page down with it. */
function apply(c: echarts.ECharts, build: EChartProps['build']) {
  try {
    c.setOption(build(readPalette()), { notMerge: true });
  } catch (err) {
    console.error(err);
  }
}

export function EChart({ build, height, ariaLabel, onClick }: EChartProps) {
  const el = useRef<HTMLDivElement>(null);
  const chart = useRef<echarts.ECharts | null>(null);
  const buildRef = useRef(build);
  buildRef.current = build;
  const clickRef = useRef(onClick);
  clickRef.current = onClick;

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const c = echarts.init(node, undefined, { renderer: 'svg' });
    chart.current = c;
    apply(c, buildRef.current);
    c.on('click', (params) => clickRef.current?.(params as Parameters<NonNullable<EChartProps['onClick']>>[0]));
    const ro = new ResizeObserver(() => c.resize());
    ro.observe(node);
    const onTheme = () => apply(c, buildRef.current);
    const onPrint = (e: Event) => {
      const printing = (e as CustomEvent<{ printing: boolean }>).detail?.printing;
      // An explicit width sticks in ECharts until reset with 'auto'.
      c.resize({ width: printing ? PRINT_WIDTH : 'auto' });
    };
    window.addEventListener(THEME_EVENT, onTheme);
    window.addEventListener(PRINT_EVENT, onPrint);
    return () => {
      ro.disconnect();
      window.removeEventListener(THEME_EVENT, onTheme);
      window.removeEventListener(PRINT_EVENT, onPrint);
      c.dispose();
      chart.current = null;
    };
  }, []);

  useEffect(() => {
    if (chart.current) apply(chart.current, build);
  }, [build]);

  return <div ref={el} className="chart" style={{ height }} role="img" aria-label={ariaLabel} />;
}
