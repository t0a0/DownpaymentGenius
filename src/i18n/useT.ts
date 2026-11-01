import { useMemo } from 'react';
import { useStore } from '../state/store';
import { makeFmt, translate, type Fmt, type Lang, type T } from './index';

export function useT(): { t: T; fmt: Fmt; lang: Lang } {
  const lang = useStore((s) => s.lang);
  return useMemo(() => ({ t: (k, p) => translate(lang, k, p), fmt: makeFmt(lang), lang }), [lang]);
}
