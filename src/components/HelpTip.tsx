import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { buildHelpPrompt } from '../help/prompt';
import { HELP } from '../help/registry';
import { hasKey } from '../i18n';
import { useT } from '../i18n/useT';
import { useStore } from '../state/store';

const CLOSE_DELAY = 200;
const GUTTER = 12;
const GAP = 8;

/** Only one popup at a time: opening one closes the previous one right away. */
let closeOpen: (() => void) | null = null;

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** The "?" next to every input, KPI and chart title: hover, focus or tap opens a short explanation. */
export function HelpTip({ k, value }: { k: string; value?: string }) {
  const { t, lang } = useT();
  const entry = HELP[k];
  // Inputs also explain how they feed the calculation.
  const use = hasKey(lang, `help.${k}.use`) ? t(`help.${k}.use`) : null;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // A mouse click focuses the button (which opens it) right before the click event; don't toggle it shut.
  const openedByFocus = useRef(0);
  // Hovering already opened it, so a click while the mouse is over the button must not close it either.
  const hovering = useRef(false);
  // The clipboard fallback focuses a temporary textarea; that must not count as leaving the popup.
  const copying = useRef(false);
  const id = useId();
  const title = t(`help.${k}.title`);

  const later = (fn: () => void, ms: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(fn, ms);
  };
  const cancel = () => clearTimeout(timer.current);
  const close = useCallback(() => {
    cancel();
    setOpen(false);
    setCopied('idle');
  }, []);

  /**
   * Keep the popup next to its button and inside the viewport (also while the page scrolls): to the right of
   * the button, else to its left, with its title level with the "?"; below or above it when neither side fits.
   */
  const place = useCallback(() => {
    if (!btn.current || !pop.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = pop.current.offsetWidth;
    const h = pop.current.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const right = r.right + GAP;
    const leftSide = r.left - GAP - w;
    if (right + w <= vw - GUTTER || leftSide >= GUTTER) {
      const left = right + w <= vw - GUTTER ? right : leftSide;
      const top = Math.max(GUTTER, Math.min(r.top + r.height / 2 - 20, vh - h - GUTTER));
      setPos({ left, top });
      return;
    }
    const left = Math.min(Math.max(GUTTER, r.left + r.width / 2 - w / 2), vw - w - GUTTER);
    let top = r.bottom + GAP;
    if (top + h > vh - GUTTER) top = Math.max(GUTTER, r.top - h - GAP);
    setPos({ left, top });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    if (closeOpen !== close) closeOpen?.();
    closeOpen = close;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
        btn.current?.focus();
      }
    };
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (!pop.current?.contains(n) && !btn.current?.contains(n)) close();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('scroll', place, { passive: true, capture: true });
    window.addEventListener('resize', place);
    return () => {
      if (closeOpen === close) closeOpen = null;
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('scroll', place, { capture: true });
      window.removeEventListener('resize', place);
    };
  }, [open, close, place]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onCopy = async (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    const s = useStore.getState();
    const p = s.results.primary?.later?.purchase;
    const prompt = buildHelpPrompt(k, s.inputs, s.lang, {
      value,
      down: p ? p.cashNeeded : null,
      loan: p ? p.loan : null,
      rate: p && p.loan > 0 ? p.rateEff : null,
      ctx: s.ctx,
    });
    copying.current = true;
    const ok = await copyText(prompt);
    copying.current = false;
    target.focus();
    setCopied(ok ? 'ok' : 'fail');
  };

  return (
    <>
      <button
        ref={btn}
        type="button"
        className="help-btn"
        aria-label={t('help.open', { title })}
        aria-describedby={`${id}-d`}
        aria-expanded={open}
        aria-controls={open ? `${id}-p` : undefined}
        onPointerEnter={(e) => {
          if (e.pointerType !== 'mouse') return;
          hovering.current = true;
          cancel();
          setOpen(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType !== 'mouse') return;
          hovering.current = false;
          later(close, CLOSE_DELAY);
        }}
        onFocus={() => {
          if (!open) openedByFocus.current = performance.now();
          setOpen(true);
        }}
        onBlur={(e) => {
          // Only when focus moves somewhere else (keyboard); clicks outside are handled by the pointerdown listener.
          const n = e.relatedTarget as Node | null;
          if (n && !copying.current && !pop.current?.contains(n)) later(close, CLOSE_DELAY);
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          cancel();
          if (hovering.current || performance.now() - openedByFocus.current < 500) {
            setOpen(true);
            return;
          }
          setOpen((o) => !o);
        }}
      >
        ?
      </button>
      {/* aria-describedby may point at a hidden element; keeping it hidden keeps headings' names clean */}
      <span id={`${id}-d`} hidden>
        {t(`help.${k}.short`)}
        {use && ` ${use}`}
      </span>
      {open &&
        createPortal(
          <div
            ref={pop}
            id={`${id}-p`}
            role="dialog"
            aria-label={title}
            className="help-pop"
            style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: 0 }}
            onPointerEnter={cancel}
            onPointerLeave={(e) => e.pointerType === 'mouse' && later(close, CLOSE_DELAY)}
            onBlur={(e) => {
              const n = e.relatedTarget as Node | null;
              if (n && !copying.current && !pop.current?.contains(n) && n !== btn.current) later(close, CLOSE_DELAY);
            }}
          >
            <div className="help-title">{title}</div>
            {entry && (
              <div className="help-term">
                <span>{t('help.germanTerm')}:</span> <em lang="de">{entry.germanTerm}</em>
              </div>
            )}
            <p>{t(`help.${k}.short`)}</p>
            {use && (
              <p className="help-use">
                <span>{t('help.use')}:</span> {use}
              </p>
            )}
            {entry?.hint && (
              <p className="help-hint">
                <span>{t('help.typical')}:</span> {t(entry.hint)}
              </p>
            )}
            <button type="button" className="btn btn-small" onClick={onCopy}>
              {copied === 'ok' ? t('help.copied') : copied === 'fail' ? t('help.copyFailed') : t('help.copy')}
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Label({ k, htmlFor, value }: { k: string; htmlFor?: string; value?: string }) {
  const { t } = useT();
  return (
    <span className="label-row">
      <label htmlFor={htmlFor}>{t(`help.${k}.title`)}</label>
      <HelpTip k={k} value={value} />
    </span>
  );
}
