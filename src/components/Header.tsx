import { useRef, useState } from 'react';
import { useT } from '../i18n/useT';
import { exportJson, parseImport, saveCurrent, shareUrl } from '../state/persistence';
import { useStore, type Theme } from '../state/store';
import { ScenarioMenu } from './ScenarioMenu';

function download(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function Header() {
  const { t, lang } = useT();
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const setLang = useStore((s) => s.setLang);
  const [toast, setToast] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const onShare = async () => {
    const s = useStore.getState();
    const url = shareUrl(s.inputs, s.scenarioName);
    try {
      await navigator.clipboard.writeText(url);
      flash(t('action.shareCopied'));
    } catch {
      window.prompt(t('action.share'), url);
    }
  };

  const onExport = () => {
    const s = useStore.getState();
    const name = s.scenarioName ?? 'DownpaymentGenius';
    download(`${name.replace(/[^\w-]+/g, '_')}.json`, exportJson(name, s.inputs));
  };

  const onImport = async (f: File) => {
    const s = useStore.getState();
    const parsed = parseImport(await f.text(), s.ctx);
    if (!parsed) return flash(t('import.error'));
    s.setInputs(parsed.inputs, { name: parsed.name, shared: false });
    flash(t('import.ok', { name: parsed.name }));
  };

  return (
    <header className="topbar">
      <div className="brand">
        <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill="var(--button)" />
          <path d="M6 16.5 16 8l10 8.5V25a1 1 0 0 1-1 1h-6v-6h-6v6H7a1 1 0 0 1-1-1z" fill="var(--on-button)" />
        </svg>
        <div>
          <h1>{t('app.title')}</h1>
          <p className="tagline">{t('app.tagline')}</p>
        </div>
      </div>
      <nav className="actions no-print" aria-label="Actions">
        <ScenarioMenu />
        <button type="button" className="btn" onClick={() => file.current?.click()}>
          {t('action.import')}
        </button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = '';
          }}
        />
        <button type="button" className="btn" onClick={onExport}>
          {t('action.export')}
        </button>
        <button type="button" className="btn" onClick={onShare}>
          {t('action.share')}
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          {t('action.pdf')}
        </button>
        <label className="sr-only" htmlFor="theme-select">
          {t('theme.label')}
        </label>
        <select
          id="theme-select"
          className="select select-compact"
          value={theme}
          onChange={(e) => setTheme(e.target.value as Theme)}
        >
          {(['auto', 'light', 'dark'] as const).map((th) => (
            <option key={th} value={th}>
              {t(`theme.${th}`)}
            </option>
          ))}
        </select>
        <div className="segmented" role="group" aria-label={t('lang.label')}>
          {(['en', 'de'] as const).map((l) => (
            <button key={l} type="button" aria-pressed={lang === l} lang={l} onClick={() => setLang(l)}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </nav>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </header>
  );
}

export function SharedBanner() {
  const { t } = useT();
  const shared = useStore((s) => s.shared);
  if (!shared) return null;
  const clearHash = () => history.replaceState(null, '', window.location.pathname + window.location.search);
  return (
    <div className="banner no-print" role="status">
      <span>{t('shared.title')}</span>
      <button
        type="button"
        className="btn btn-primary btn-small"
        onClick={() => {
          const s = useStore.getState();
          s.setShared(false);
          saveCurrent(s.inputs, s.scenarioName);
          clearHash();
        }}
      >
        {t('shared.keep')}
      </button>
      <button
        type="button"
        className="btn btn-small"
        onClick={() => {
          clearHash();
          window.location.reload();
        }}
      >
        {t('shared.discard')}
      </button>
    </div>
  );
}
