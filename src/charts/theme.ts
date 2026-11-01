// ECharts cannot read CSS variables, so colours are read from the tokens with getComputedStyle and re-applied
// whenever the theme changes (THEME_EVENT). Print forces the light theme before charts re-render.

export const THEME_EVENT = 'dg-theme';
export const PRINT_EVENT = 'dg-print';

export interface Palette {
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  grid: string;
  axis: string;
  surface: string;
  surfaceRaised: string;
  accent: string;
  now: string;
  later: string;
  never: string;
  heat: string[];
  tornadoLow: string;
  tornadoHigh: string;
  good: string;
  warning: string;
  serious: string;
  critical: string;
  font: string;
}

export function readPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return {
    text: v('--text'),
    textSecondary: v('--text-secondary'),
    textMuted: v('--text-muted'),
    border: v('--border'),
    grid: v('--grid'),
    axis: v('--axis'),
    surface: v('--surface'),
    surfaceRaised: v('--surface-raised'),
    accent: v('--accent'),
    now: v('--series-now'),
    later: v('--series-later'),
    never: v('--series-never'),
    heat: Array.from({ length: 13 }, (_, i) => v(`--heat-${i}`)),
    tornadoLow: v('--tornado-low'),
    tornadoHigh: v('--tornado-high'),
    good: v('--status-good'),
    warning: v('--status-warning'),
    serious: v('--status-serious'),
    critical: v('--status-critical'),
    font: v('--font') || 'system-ui, sans-serif',
  };
}

/** #rrggbb → rgba() with alpha */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function baseOption(p: Palette) {
  return {
    backgroundColor: 'transparent',
    animation: false,
    textStyle: { fontFamily: p.font, color: p.textSecondary, fontSize: 12 },
    tooltip: {
      backgroundColor: p.surfaceRaised,
      borderColor: p.border,
      borderWidth: 1,
      padding: [8, 10],
      textStyle: { color: p.text, fontFamily: p.font, fontSize: 13 },
      extraCssText: 'box-shadow: var(--shadow); border-radius: 8px; font-variant-numeric: tabular-nums;',
    },
    aria: { enabled: true },
  };
}

export function axisStyle(p: Palette) {
  return {
    axisLine: { lineStyle: { color: p.axis } },
    axisTick: { lineStyle: { color: p.axis } },
    axisLabel: { color: p.textMuted, fontFamily: p.font, fontSize: 12, hideOverlap: true },
    splitLine: { lineStyle: { color: p.grid } },
    nameTextStyle: { color: p.textSecondary, fontFamily: p.font, fontSize: 12 },
  };
}

export function legendStyle(p: Palette) {
  return {
    textStyle: { color: p.textSecondary, fontFamily: p.font, fontSize: 12 },
    itemWidth: 18,
    itemHeight: 10,
    icon: 'roundRect',
  };
}
