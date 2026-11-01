import { useEffect } from 'react';
import { PRINT_EVENT, THEME_EVENT } from './charts/theme';
import { AssumptionsFooter } from './components/AssumptionsFooter';
import { BreakevenList } from './components/BreakevenList';
import { Header, SharedBanner } from './components/Header';
import { Heatmap } from './components/Heatmap';
import { InputPanel } from './components/InputPanel';
import { KpiStrip } from './components/KpiStrip';
import { NetWorthChart } from './components/NetWorthChart';
import { PrintSummary } from './components/PrintSummary';
import { ScenarioTable } from './components/ScenarioTable';
import { SensitivityChart } from './components/SensitivityChart';
import { StressPanel } from './components/StressPanel';
import { TimingChart } from './components/TimingChart';
import { WasteBars } from './components/WasteBars';
import { YearlyTable } from './components/YearlyTable';
import { useT } from './i18n/useT';
import { saveCurrent } from './state/persistence';
import { useStore } from './state/store';
import { startEngine } from './worker/client';

const AUTOSAVE_MS = 500;

function applyTheme(theme: 'auto' | 'light' | 'dark') {
  const root = document.documentElement;
  if (theme === 'auto') delete root.dataset.theme;
  else root.dataset.theme = theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function App() {
  const { t, lang } = useT();
  const theme = useStore((s) => s.theme);
  const computing = useStore((s) => !s.results.primary);
  const error = useStore((s) => s.results.error);

  useEffect(() => startEngine(), []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `${t('app.title')} · ${t('app.tagline')}`;
  }, [lang, t]);

  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => useStore.getState().theme === 'auto' && window.dispatchEvent(new Event(THEME_EVENT));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  // Print: force the light theme and lay charts out at page width, then restore.
  useEffect(() => {
    const before = () => {
      document.documentElement.dataset.theme = 'light';
      window.dispatchEvent(new Event(THEME_EVENT));
      window.dispatchEvent(new CustomEvent(PRINT_EVENT, { detail: { printing: true } }));
    };
    const after = () => {
      applyTheme(useStore.getState().theme);
      window.dispatchEvent(new CustomEvent(PRINT_EVENT, { detail: { printing: false } }));
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, []);

  // Debounced autosave; a shared link never overwrites it.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useStore.subscribe((s, prev) => {
      if (s.shared) return;
      if (s.inputs === prev.inputs && s.scenarioName === prev.scenarioName) return;
      clearTimeout(timer);
      timer = setTimeout(() => saveCurrent(s.inputs, s.scenarioName), AUTOSAVE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, []);

  return (
    <div className="app">
      <Header />
      <SharedBanner />
      <main className="layout">
        <InputPanel />
        <div className="results" aria-live="polite" aria-busy={computing}>
          <PrintSummary />
          {error && <p className="error">{error}</p>}
          <KpiStrip />
          <NetWorthChart />
          <TimingChart />
          <Heatmap />
          <WasteBars />
          <div className="two-col">
            <BreakevenList />
            <StressPanel />
          </div>
          <SensitivityChart />
          <ScenarioTable />
          <YearlyTable />
          <AssumptionsFooter />
        </div>
      </main>
    </div>
  );
}
