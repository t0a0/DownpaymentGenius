import { create } from 'zustand';
import { cityById } from '../data/cities';
import {
  defaultContext,
  defaultInputs,
  MAINTENANCE_DEFAULT,
  type BreakevenRow,
  type Inputs,
  type PropertyType,
  type SimContext,
  type TornadoResult,
} from '../engine';
import type { Lang } from '../i18n';
import type { PrimaryPayload, ScenarioPayload, Selection, WorkerMessage } from '../worker/protocol';
import { setPath } from './fields';
import { loadCurrent, readShareHash, storageGet, storageSet } from './persistence';

export type Theme = 'auto' | 'light' | 'dark';
export type Mode = 'basic' | 'advanced';

export interface Results {
  /** latest job id sent to the worker */
  requested: number;
  primary: PrimaryPayload | null;
  primaryJob: number;
  scenarios: ScenarioPayload | null;
  scenariosJob: number;
  sensitivity: TornadoResult | null;
  sensitivityJob: number;
  breakeven: BreakevenRow[] | null;
  breakevenJob: number;
  error: string | null;
}

export interface AppState {
  ctx: SimContext;
  inputs: Inputs;
  selection: Selection | null;
  lang: Lang;
  theme: Theme;
  mode: Mode;
  /** name of the loaded named scenario, if any */
  scenarioName: string | null;
  /** true while viewing a share link: autosave is paused */
  shared: boolean;
  results: Results;
  setField: (key: string, value: unknown) => void;
  setInputs: (inputs: Inputs, opts?: { name?: string | null; shared?: boolean }) => void;
  setSelection: (sel: Selection | null) => void;
  setLang: (lang: Lang) => void;
  setTheme: (theme: Theme) => void;
  setMode: (mode: Mode) => void;
  setScenarioName: (name: string | null) => void;
  setShared: (shared: boolean) => void;
  markRequested: (jobId: number) => void;
  receive: (msg: WorkerMessage) => void;
}

const otherType = (t: PropertyType): PropertyType => (t === 'apartment' ? 'house' : 'apartment');

/** Inputs changes that pull other fields along (city preset, property type defaults). */
function applySideEffects(prev: Inputs, next: Inputs, key: string): Inputs {
  if (key === 'property.city') {
    const c = cityById(next.property.city);
    return {
      ...next,
      property: { ...next.property, state: c.state, priceGrowth: c.priceGrowth },
      rent: { ...next.rent, rentGrowth: c.rentGrowth },
    };
  }
  if (key === 'property.type' && prev.property.maintenance === MAINTENANCE_DEFAULT[otherType(next.property.type)]) {
    return { ...next, property: { ...next.property, maintenance: MAINTENANCE_DEFAULT[next.property.type] } };
  }
  return next;
}

function initialLang(): Lang {
  const stored = storageGet('dg:lang');
  if (stored === 'en' || stored === 'de') return stored;
  try {
    return navigator.language?.toLowerCase().startsWith('de') ? 'de' : 'en';
  } catch {
    return 'en';
  }
}

function initial(): Pick<AppState, 'ctx' | 'inputs' | 'scenarioName' | 'shared' | 'lang' | 'theme' | 'mode'> {
  const ctx = defaultContext();
  const theme = storageGet('dg:theme');
  const mode = storageGet('dg:mode');
  const base = {
    ctx,
    lang: initialLang(),
    theme: (theme === 'light' || theme === 'dark' ? theme : 'auto') as Theme,
    mode: (mode === 'advanced' ? 'advanced' : 'basic') as Mode,
  };
  const shared = typeof window !== 'undefined' ? readShareHash(window.location.hash, ctx) : null;
  if (shared) return { ...base, inputs: shared.inputs, scenarioName: shared.name, shared: true };
  const saved = loadCurrent(ctx);
  if (saved) return { ...base, inputs: saved.inputs, scenarioName: saved.name, shared: false };
  return { ...base, inputs: defaultInputs(ctx), scenarioName: null, shared: false };
}

const emptyResults: Results = {
  requested: 0,
  primary: null,
  primaryJob: 0,
  scenarios: null,
  scenariosJob: 0,
  sensitivity: null,
  sensitivityJob: 0,
  breakeven: null,
  breakevenJob: 0,
  error: null,
};

export const useStore = create<AppState>((set, get) => ({
  ...initial(),
  selection: null,
  results: emptyResults,
  setField: (key, value) => {
    const prev = get().inputs;
    set({ inputs: applySideEffects(prev, setPath(prev, key, value), key) });
  },
  setInputs: (inputs, opts) =>
    set({
      inputs,
      selection: null,
      ...(opts?.name !== undefined ? { scenarioName: opts.name } : {}),
      ...(opts?.shared !== undefined ? { shared: opts.shared } : {}),
    }),
  setSelection: (selection) => set({ selection }),
  setLang: (lang) => {
    storageSet('dg:lang', lang);
    set({ lang });
  },
  setTheme: (theme) => {
    storageSet('dg:theme', theme);
    set({ theme });
  },
  setMode: (mode) => {
    storageSet('dg:mode', mode);
    set({ mode });
  },
  setScenarioName: (scenarioName) => set({ scenarioName }),
  setShared: (shared) => set({ shared }),
  markRequested: (jobId) => set((s) => ({ results: { ...s.results, requested: jobId } })),
  receive: (msg) =>
    set((s) => {
      if (msg.jobId !== s.results.requested) return {};
      const r: Results = { ...s.results, error: null };
      switch (msg.type) {
        case 'primary':
          r.primary = msg.data;
          r.primaryJob = msg.jobId;
          break;
        case 'scenarios':
          r.scenarios = msg.data;
          r.scenariosJob = msg.jobId;
          break;
        case 'sensitivity':
          r.sensitivity = msg.data;
          r.sensitivityJob = msg.jobId;
          break;
        case 'breakeven':
          r.breakeven = msg.data;
          r.breakevenJob = msg.jobId;
          break;
        case 'error':
          r.error = msg.message;
          break;
      }
      return { results: r };
    }),
}));
