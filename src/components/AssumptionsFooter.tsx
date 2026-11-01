import { SOURCES } from '../data/history';
import { RATES_AS_OF } from '../engine';
import { useView } from './view';

export function AssumptionsFooter() {
  const { t, fmt } = useView();
  return (
    <footer className="footer">
      <h2>{t('footer.title')}</h2>
      <p>{t('footer.method')}</p>
      <p>{t('footer.assumptions')}</p>
      <p>{t('footer.rates', { date: fmt.date(new Date(RATES_AS_OF)) })}</p>
      <h3>{t('footer.sources')}</h3>
      <ul className="sources">
        {Object.entries(SOURCES).map(([id, s]) => (
          <li key={id}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="disclaimer">{t('footer.disclaimer')}</p>
    </footer>
  );
}
