import type { ReactNode } from 'react';
import { useT } from '../i18n/useT';
import { HelpTip } from './HelpTip';

export function Card({
  k,
  children,
  stale,
  className,
  actions,
}: {
  k: string;
  children: ReactNode;
  stale?: boolean;
  className?: string;
  actions?: ReactNode;
}) {
  const { t } = useT();
  return (
    <section className={`card ${className ?? ''}`} aria-busy={stale || undefined}>
      <header className="card-head">
        <h2>
          {t(`help.${k}.title`)} <HelpTip k={k} />
        </h2>
        {stale && <span className="updating">{t('status.updating')}</span>}
        {actions}
      </header>
      {children}
    </section>
  );
}
