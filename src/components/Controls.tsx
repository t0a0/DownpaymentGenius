import { useId } from 'react';
import { CITIES, CITY_NAMES, STATE_NAMES } from '../data/cities';
import { GREST, RATES_AS_OF, STATES } from '../engine';
import { useT } from '../i18n/useT';
import { getPath, type ListField, type SelectField, type ToggleField } from '../state/fields';
import { useStore } from '../state/store';
import { Label } from './HelpTip';
import { parseNumber } from './NumberSlider';

export function SelectInput({ field }: { field: SelectField }) {
  const { t, lang, fmt } = useT();
  const value = useStore((s) => getPath(s.inputs, field.key) as string | number);
  const setField = useStore((s) => s.setField);
  const id = useId();
  const options =
    field.options === 'cities'
      ? CITIES.map((c) => ({ value: c.id, text: CITY_NAMES[c.id][lang] }))
      : field.options === 'states'
        ? STATES.map((s) => ({ value: s, text: `${STATE_NAMES[s][lang]} (${fmt.pct(GREST[s], 1)})` })).sort((a, b) =>
            a.text.localeCompare(b.text, lang),
          )
        : field.options.map((o) => ({ value: o.value, text: t(o.label) }));
  return (
    <div className="field">
      <Label k={field.key} htmlFor={id} />
      <select
        id={id}
        className="select"
        value={String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value);
          if (o) setField(field.key, o.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.text}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleInput({ field }: { field: ToggleField }) {
  const { t } = useT();
  const value = useStore((s) => Boolean(getPath(s.inputs, field.key)));
  const setField = useStore((s) => s.setField);
  const id = useId();
  return (
    <div className="field field-toggle">
      <Label k={field.key} htmlFor={id} />
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={value}
        className="switch"
        onClick={() => setField(field.key, !value)}
      >
        <span className="switch-knob" />
        <span className="sr-only">{t(value ? 'opt.on' : 'opt.off')}</span>
      </button>
    </div>
  );
}

export function YearsInput({ field }: { field: ListField }) {
  const { t } = useT();
  const years = useStore((s) => getPath(s.inputs, field.key) as number[]);
  const startYear = useStore((s) => s.ctx.startYear);
  const setField = useStore((s) => s.setField);
  return (
    <div className="field">
      <Label k={field.key} />
      {years.length === 0 && <p className="hint">{t('children.none')}</p>}
      <div className="chips">
        {years.map((y, i) => (
          <span className="chip" key={i}>
            <input
              type="number"
              className="chip-input"
              min={1990}
              max={startYear + 20}
              value={y}
              aria-label={`${t(`help.${field.key}.title`)} ${i + 1}`}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v)) setField(field.key, years.map((x, j) => (j === i ? v : x)));
              }}
            />
            <button
              type="button"
              className="chip-x"
              aria-label={t('children.remove')}
              onClick={() => setField(field.key, years.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      {years.length < 10 && (
        <button type="button" className="btn btn-small" onClick={() => setField(field.key, [...years, startYear - 3])}>
          + {t('children.add')}
        </button>
      )}
    </div>
  );
}

function SmallNumber({
  value,
  onChange,
  label,
  signed,
}: {
  value: number;
  onChange: (x: number) => void;
  label: string;
  signed?: boolean;
}) {
  const { fmt } = useT();
  return (
    <input
      type="text"
      inputMode="decimal"
      className="num-input num-small"
      aria-label={label}
      defaultValue={fmt.num(value, 2)}
      key={value}
      onBlur={(e) => {
        const x = parseNumber(e.target.value, true);
        if (Number.isFinite(x) && (signed || x >= 0)) onChange(Math.round(x * 100) / 100);
        else e.target.value = fmt.num(value, 2);
      }}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  );
}

const TIER_LABELS = ['≤ 60 %', '≤ 70 %', '≤ 80 %', '≤ 90 %', '≤ 100 %', '> 100 %'];

export function TiersInput({ field }: { field: ListField }) {
  const { t, fmt } = useT();
  const tiers = useStore((s) => s.inputs.mortgage.rateTiers);
  const financeFees = useStore((s) => s.inputs.mortgage.financeFees);
  const setField = useStore((s) => s.setField);
  return (
    <div className="field">
      <Label k={field.key} />
      <table className="mini-table">
        <thead>
          <tr>
            <th>{t('tiers.ltv')}</th>
            <th>{t('tiers.rate')}</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((r, i) => (
            <tr key={i} className={i === 5 && !financeFees ? 'muted' : undefined}>
              <td>{TIER_LABELS[i]}</td>
              <td>
                <SmallNumber
                  value={r}
                  label={`${t('tiers.rate')} ${TIER_LABELS[i]}`}
                  onChange={(x) => setField(field.key, tiers.map((y, j) => (j === i ? x : y)))}
                />{' '}
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="hint">
        {t('tiers.asOf', { date: fmt.date(new Date(RATES_AS_OF)) })} {t('hist.rateTiers')}
      </p>
    </div>
  );
}

export function FixAdjInput({ field }: { field: ListField }) {
  const { t } = useT();
  const adj = useStore((s) => s.inputs.mortgage.fixationAdj);
  const setField = useStore((s) => s.setField);
  return (
    <div className="field">
      <Label k={field.key} />
      <table className="mini-table">
        <thead>
          <tr>
            <th>{t('tiers.fix')}</th>
            <th>{t('tiers.adj')}</th>
          </tr>
        </thead>
        <tbody>
          {[5, 10, 15, 20].map((y, i) => (
            <tr key={y}>
              <td>{t(`opt.fix.${y}`)}</td>
              <td>
                <SmallNumber
                  value={adj[i]}
                  signed
                  label={`${t('tiers.adj')} ${t(`opt.fix.${y}`)}`}
                  onChange={(x) => setField(field.key, adj.map((v, j) => (j === i ? x : v)))}
                />{' '}
                {t('unit.pp')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
