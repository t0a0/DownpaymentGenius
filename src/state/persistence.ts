// localStorage + JSON + share links. All t0a0.github.io project sites share one origin, hence the dg: prefix.
// Every storage access is wrapped: private windows and blocked storage must never break the page.

import LZString from 'lz-string';
import { SCHEMA_VERSION, type Inputs, type SimContext } from '../engine';
import { migrate } from './schema';

export const APP_ID = 'DownpaymentGenius';
const KEY_CURRENT = 'dg:current';
const KEY_SCENARIOS = 'dg:scenarios';

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // storage full or blocked: autosave is a convenience only
  }
}

function readJson(key: string): unknown {
  const raw = storageGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------- autosave ----------

export function loadCurrent(ctx: SimContext): { inputs: Inputs; name: string | null } | null {
  const v = readJson(KEY_CURRENT) as { inputs?: unknown; name?: unknown } | null;
  if (!v) return null;
  const inputs = migrate(v.inputs, ctx);
  return inputs ? { inputs, name: typeof v.name === 'string' ? v.name : null } : null;
}

export function saveCurrent(inputs: Inputs, name: string | null): void {
  storageSet(KEY_CURRENT, JSON.stringify({ inputs, name, savedAt: new Date().toISOString() }));
}

// ---------- named scenarios ----------

interface StoredScenario {
  inputs: unknown;
  savedAt: string;
}

function readScenarios(): Record<string, StoredScenario> {
  const v = readJson(KEY_SCENARIOS);
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, StoredScenario>) : {};
}

const writeScenarios = (s: Record<string, StoredScenario>) => storageSet(KEY_SCENARIOS, JSON.stringify(s));

export function listScenarios(): { name: string; savedAt: string }[] {
  return Object.entries(readScenarios())
    .map(([name, s]) => ({ name, savedAt: s.savedAt }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function saveScenario(name: string, inputs: Inputs): void {
  const all = readScenarios();
  all[name] = { inputs, savedAt: new Date().toISOString() };
  writeScenarios(all);
}

export function loadScenario(name: string, ctx: SimContext): Inputs | null {
  return migrate(readScenarios()[name]?.inputs, ctx);
}

export function renameScenario(from: string, to: string): void {
  const all = readScenarios();
  if (!all[from] || from === to) return;
  all[to] = all[from];
  delete all[from];
  writeScenarios(all);
}

export function deleteScenario(name: string): void {
  const all = readScenarios();
  delete all[name];
  writeScenarios(all);
}

// ---------- JSON export / import ----------

export interface ExportFile {
  app: string;
  schemaVersion: number;
  name: string;
  inputs: Inputs;
}

export const exportJson = (name: string, inputs: Inputs): string =>
  JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION, name, inputs } satisfies ExportFile, null, 2);

export function parseImport(text: string, ctx: SimContext): { name: string; inputs: Inputs } | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Partial<ExportFile>;
  if (f.app !== APP_ID) return null;
  const inputs = migrate(f.inputs, ctx);
  return inputs ? { name: typeof f.name === 'string' && f.name ? f.name : 'Imported', inputs } : null;
}

// ---------- share link ----------

export function shareHash(inputs: Inputs, name: string | null): string {
  const payload = JSON.stringify({ v: SCHEMA_VERSION, n: name ?? undefined, i: inputs });
  return `#s=${LZString.compressToEncodedURIComponent(payload)}`;
}

export function shareUrl(inputs: Inputs, name: string | null): string {
  const { origin, pathname, search } = window.location;
  return origin + pathname + search + shareHash(inputs, name);
}

export function readShareHash(hash: string, ctx: SimContext): { inputs: Inputs; name: string | null } | null {
  const m = /^#s=(.+)$/.exec(hash);
  if (!m) return null;
  try {
    const json = LZString.decompressFromEncodedURIComponent(m[1]);
    if (!json) return null;
    const p = JSON.parse(json) as { n?: unknown; i?: unknown };
    const inputs = migrate(p.i, ctx);
    return inputs ? { inputs, name: typeof p.n === 'string' ? p.n : null } : null;
  } catch {
    return null;
  }
}
