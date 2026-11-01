import { useId, useState } from 'react';
import { clamp } from '../engine';
import { useT } from '../i18n/useT';
import { getPath, type NumberField } from '../state/fields';
import { useStore } from '../state/store';
import { Label } from './HelpTip';

const roundTo = (x: number, step: number) => {
  const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  return Number((Math.round(x / step) * step).toFixed(d));
};

/** Decimal fields accept "," or "." as the decimal mark; integer fields ignore any grouping characters. */
export function parseNumber(text: string, decimal: boolean): number {
  const s = text.replace(/[\s  €%]/g, '');
  if (!s || s === '-') return NaN;
  if (decimal) {
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    const dec = Math.max(lastComma, lastDot);
    if (dec < 0) return Number(s);
    return Number(s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1));
  }
  return Number(s.replace(/[.,]/g, ''));
}

/** Slider and number box kept in sync, with unit, help "?" and the "history says" hint. */
export function NumberSlider({ field }: { field: NumberField }) {
  const { t, fmt } = useT();
  const value = useStore((s) => getPath(s.inputs, field.key) as number);
  const setField = useStore((s) => s.setField);
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const digits = field.digits ?? 0;
  const decimal = digits > 0;
  const plain = field.unit === 'year';
  const show = (x: number) => (plain ? String(x) : fmt.num(x, digits));
  const sMin = field.sliderMin ?? field.min;
  const sMax = field.sliderMax ?? field.max;
  const sVal = clamp(value, sMin, sMax);
  const fill = ((sVal - sMin) / (sMax - sMin || 1)) * 100;
  const unit = t(`unit.${field.unit}`);

  const commit = (text: string) => {
    const x = parseNumber(text, decimal);
    if (Number.isFinite(x)) setField(field.key, clamp(roundTo(x, Math.min(field.step, decimal ? 10 ** -digits : 1)), field.min, field.max));
    setDraft(null);
  };

  return (
    <div className="field">
      <Label k={field.key} htmlFor={id} />
      <div className="num-row">
        <input
          type="range"
          className="slider"
          min={sMin}
          max={sMax}
          step={field.step}
          value={sVal}
          aria-label={t(`help.${field.key}.title`)}
          style={{ ['--fill' as string]: `${fill}%` }}
          onChange={(e) => setField(field.key, roundTo(Number(e.target.value), field.step))}
        />
        <span className="num-box">
          <input
            id={id}
            type="text"
            inputMode={decimal || field.min < 0 ? 'decimal' : 'numeric'}
            className="num-input"
            value={draft ?? show(value)}
            onFocus={(e) => {
              setDraft(show(value));
              e.target.select();
            }}
            onChange={(e) => {
              setDraft(e.target.value);
              const x = parseNumber(e.target.value, decimal);
              if (Number.isFinite(x) && x >= field.min && x <= field.max) setField(field.key, x);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              if (e.key === 'Escape') {
                setDraft(null);
                (e.target as HTMLInputElement).blur();
              }
            }}
          />
          <span className="unit">{unit}</span>
        </span>
      </div>
      {field.hint && <p className="hint">{t(field.hint)}</p>}
    </div>
  );
}
