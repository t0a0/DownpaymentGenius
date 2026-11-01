import { useEffect, useRef, useState } from 'react';
import { defaultInputs } from '../engine';
import { useT } from '../i18n/useT';
import { deleteScenario, listScenarios, loadScenario, renameScenario, saveScenario } from '../state/persistence';
import { useStore } from '../state/store';

/** Save / load / rename / delete named scenarios (localStorage). */
export function ScenarioMenu() {
  const { t, fmt } = useT();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState(listScenarios);
  const [naming, setNaming] = useState<{ mode: 'save' | 'rename'; from?: string; value: string } | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const name = useStore((s) => s.scenarioName);
  const refresh = () => setList(listScenarios());

  useEffect(() => {
    if (!open) return;
    refresh();
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) {
        setOpen(false);
        setNaming(null);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const submit = () => {
    if (!naming) return;
    const n = naming.value.trim();
    if (!n) return;
    const s = useStore.getState();
    if (naming.mode === 'save') {
      saveScenario(n, s.inputs);
      s.setScenarioName(n);
    } else if (naming.from) {
      renameScenario(naming.from, n);
      if (s.scenarioName === naming.from) s.setScenarioName(n);
    }
    setNaming(null);
    refresh();
  };

  return (
    <div className="menu" ref={root}>
      <button type="button" className="btn" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {t('menu.scenarios')}
        {name ? `: ${name}` : ''} ▾
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <div className="menu-row">
            <span className="muted small">{name ?? t('menu.current')}</span>
          </div>
          {name && (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                saveScenario(name, useStore.getState().inputs);
                refresh();
                setOpen(false);
              }}
            >
              {t('menu.save')} “{name}”
            </button>
          )}
          {naming ? (
            <form
              className="menu-form"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <input
                autoFocus
                className="text-input"
                placeholder={t('menu.namePlaceholder')}
                value={naming.value}
                maxLength={60}
                onChange={(e) => setNaming({ ...naming, value: e.target.value })}
              />
              <button type="submit" className="btn btn-primary btn-small">
                {t('action.ok')}
              </button>
              <button type="button" className="btn btn-small" onClick={() => setNaming(null)}>
                {t('action.cancel')}
              </button>
            </form>
          ) : (
            <button type="button" role="menuitem" className="menu-item" onClick={() => setNaming({ mode: 'save', value: name ?? '' })}>
              {t('menu.saveAs')}
            </button>
          )}
          <div className="menu-sep" />
          {list.length === 0 && <p className="menu-row muted small">{t('menu.noScenarios')}</p>}
          {list.map((s) => (
            <div key={s.name} className="menu-scenario">
              <button
                type="button"
                role="menuitem"
                className="menu-item grow"
                title={fmt.date(new Date(s.savedAt))}
                onClick={() => {
                  const st = useStore.getState();
                  const inputs = loadScenario(s.name, st.ctx);
                  if (inputs) st.setInputs(inputs, { name: s.name });
                  setOpen(false);
                }}
              >
                {s.name}
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`${t('menu.rename')} ${s.name}`}
                onClick={() => setNaming({ mode: 'rename', from: s.name, value: s.name })}
              >
                ✎
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label={`${t('menu.delete')} ${s.name}`}
                onClick={() => {
                  if (!window.confirm(t('menu.confirmDelete', { name: s.name }))) return;
                  deleteScenario(s.name);
                  if (useStore.getState().scenarioName === s.name) useStore.getState().setScenarioName(null);
                  refresh();
                }}
              >
                🗑
              </button>
            </div>
          ))}
          <div className="menu-sep" />
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              const st = useStore.getState();
              st.setInputs(defaultInputs(st.ctx), { name: null });
              setOpen(false);
            }}
          >
            {t('menu.reset')}
          </button>
        </div>
      )}
    </div>
  );
}
