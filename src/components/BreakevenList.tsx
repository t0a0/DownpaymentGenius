import { knobBase, type Knob } from '../engine';
import { useStore } from '../state/store';
import { Card } from './Card';
import { useView } from './view';

export function BreakevenList() {
  const { t, fmt } = useView();
  const rows = useStore((s) => s.results.breakeven);
  const job = useStore((s) => s.results.breakevenJob);
  const requested = useStore((s) => s.results.requested);
  const inputs = useStore((s) => s.inputs);
  const val = (k: Knob, x: number) => `${fmt.num(x, 2)} ${t(`knob.unit.${k}`)}`;

  return (
    <Card k="chart.breakeven" stale={job !== requested}>
      {!rows ? (
        <p className="hint">{t('status.computing')}</p>
      ) : (
        <ul className="breakeven">
          {rows.map((r) => {
            const knob = t(`knob.${r.knob}`);
            const range = { knob, min: val(r.knob, r.min), max: val(r.knob, r.max) };
            let text: string;
            if (r.value !== null) {
              text = t(`breakeven.${r.kind}.${r.winsAbove ? 'above' : 'below'}`, { knob, value: val(r.knob, r.value) });
            } else if (r.alwaysFirst === true) text = t(`breakeven.${r.kind}.always`, range);
            else if (r.alwaysFirst === false) text = t(`breakeven.${r.kind}.never`, range);
            else text = t('breakeven.noFlip', range);
            return (
              <li key={`${r.knob}-${r.kind}`} className={r.value !== null ? 'flip' : undefined}>
                <span className={`dot ${r.kind}`} aria-hidden="true" />
                <span>
                  {text}{' '}
                  <span className="muted">({t('breakeven.current', { value: val(r.knob, knobBase(inputs, r.knob)) })})</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
