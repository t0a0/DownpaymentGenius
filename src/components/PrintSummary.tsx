import { formatFieldValue } from '../help/prompt';
import { SECTIONS } from '../state/fields';
import { useStore } from '../state/store';
import { useView } from './view';

/** Only visible in print: every input that applies, grouped by section. */
export function PrintSummary() {
  const { t, fmt, lang } = useView();
  const inputs = useStore((s) => s.inputs);
  const name = useStore((s) => s.scenarioName);
  return (
    <section className="print-only print-summary">
      <h2>
        {t('print.summary')}
        {name ? ` · ${name}` : ''}
      </h2>
      <p className="muted small">{t('print.generated', { date: fmt.date(new Date()) })}</p>
      <div className="print-grid">
        {SECTIONS.map((s) => (
          <div key={s.id}>
            <h3>{t(`section.${s.id}`)}</h3>
            <dl>
              {s.fields
                .filter((f) => !f.showIf || f.showIf(inputs))
                .map((f) => (
                  <div key={f.key} className="print-row">
                    <dt>{t(`help.${f.key}.title`)}</dt>
                    <dd>{formatFieldValue(f.key, inputs, lang)}</dd>
                  </div>
                ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}
