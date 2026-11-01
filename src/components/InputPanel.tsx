import { cityById, CITY_NAMES, STATE_NAMES } from '../data/cities';
import { GREST, hessengeld, horizonYearOf } from '../engine';
import { useT } from '../i18n/useT';
import { SECTIONS, type Field } from '../state/fields';
import { useStore } from '../state/store';
import { FixAdjInput, SelectInput, TiersInput, ToggleInput, YearsInput } from './Controls';
import { NumberSlider } from './NumberSlider';

function FieldView({ field }: { field: Field }) {
  switch (field.kind) {
    case 'number':
      return <NumberSlider field={field} />;
    case 'select':
      return <SelectInput field={field} />;
    case 'toggle':
      return <ToggleInput field={field} />;
    case 'years':
      return <YearsInput field={field} />;
    case 'tiers':
      return <TiersInput field={field} />;
    case 'fixAdj':
      return <FixAdjInput field={field} />;
  }
}

function CityHint() {
  const { t, fmt, lang } = useT();
  const p = useStore((s) => s.inputs.property);
  const setField = useStore((s) => s.setField);
  const c = cityById(p.city);
  const ppm = c.pricePerM2[p.type];
  const price = Math.round((ppm * p.area) / 5000) * 5000;
  const rent = Math.round((c.rentPerM2 * p.area) / 10) * 10;
  return (
    <p className="hint">
      {t('city.typical', {
        city: CITY_NAMES[c.id][lang],
        price: fmt.eur(price),
        ppm: fmt.eur(ppm),
        rent: fmt.eur(rent),
        rpm: fmt.eur2(c.rentPerM2),
      })}{' '}
      <button
        type="button"
        className="link-btn"
        onClick={() => {
          setField('property.price', price);
          setField('rent.coldRent', rent);
        }}
      >
        {t('city.apply')}
      </button>
    </p>
  );
}

function StateHint() {
  const { t, fmt, lang } = useT();
  const inputs = useStore((s) => s.inputs);
  const ctx = useStore((s) => s.ctx);
  const st = inputs.property.state;
  const lines = [t('property.grestInfo', { state: STATE_NAMES[st][lang], rate: fmt.pct(GREST[st], 1) })];
  if (st === 'HE') {
    if (!inputs.you.firstTimeBuyer) lines.push(t('property.hessengeldOff'));
    else {
      const r = hessengeld({
        purchaseYear: ctx.startYear,
        purchaseMonth: ctx.startMonth,
        buyers: inputs.you.household === 'couple' ? 2 : 1,
        childBirthYears: inputs.you.childBirthYears,
        grest: (inputs.property.price * GREST[st]) / 100,
        assumeExtension: true,
      });
      lines.push(t('property.hessengeldInfo', { amount: fmt.eur(r.total) }));
    }
  }
  return (
    <p className="hint">
      {lines.map((l, i) => (
        <span key={i} className="block">
          {l}
        </span>
      ))}
    </p>
  );
}

function HorizonHint() {
  const { t } = useT();
  const year = useStore((s) => horizonYearOf(s.inputs, s.ctx));
  return <p className="hint">{t('horizon.resolved', { year })}</p>;
}

const AFTER: Record<string, () => React.ReactNode> = {
  'property.city': () => <CityHint />,
  'property.state': () => <StateHint />,
  'sim.horizonAge': () => <HorizonHint />,
  'sim.horizonYear': () => <HorizonHint />,
};

export function InputPanel() {
  const { t } = useT();
  const inputs = useStore((s) => s.inputs);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  return (
    <aside className="panel no-print" aria-label={t('panel.title')}>
      <div className="panel-head">
        <h2>{t('panel.title')}</h2>
        <div className="segmented" role="group">
          {(['basic', 'advanced'] as const).map((m) => (
            <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
      </div>
      {SECTIONS.map((s) => {
        const fields = s.fields.filter((f) => (mode === 'advanced' || !f.advanced) && (!f.showIf || f.showIf(inputs)));
        return (
          <details key={s.id} className="section" open>
            <summary>
              <h3>{t(`section.${s.id}`)}</h3>
            </summary>
            <div className="section-body">
              {fields.map((f) => (
                <div key={f.key}>
                  <FieldView field={f} />
                  {AFTER[f.key]?.()}
                </div>
              ))}
            </div>
          </details>
        );
      })}
    </aside>
  );
}
