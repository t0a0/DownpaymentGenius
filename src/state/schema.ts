import { z } from 'zod';
import { defaultInputs, SCHEMA_VERSION, STATES, type Inputs, type SimContext } from '../engine';

const num = (min: number, max: number) => z.number().finite().min(min).max(max);
const pct = num(-100, 100);

export const inputsSchema = z.object({
  version: z.number().int(),
  you: z.object({
    capital: num(0, 1e9),
    capitalGainPct: num(0, 100),
    cash: num(0, 1e9),
    cushion: num(0, 1e9),
    monthlySavings: num(0, 1e7),
    savingsGrowth: pct,
    netIncome: num(0, 1e7),
    incomeGrowth: pct,
    birthYear: num(1900, 2100),
    household: z.enum(['single', 'couple']),
    churchTax: z.boolean(),
    firstTimeBuyer: z.boolean(),
    childBirthYears: z.array(num(1900, 2100)).max(20),
  }),
  invest: z.object({
    expectedReturn: pct,
    fundType: z.enum(['equity', 'mixed', 'bond']),
    cashRate: pct,
    basiszins: pct,
  }),
  rent: z.object({
    coldRent: num(0, 1e7),
    rentGrowth: pct,
  }),
  property: z.object({
    type: z.enum(['apartment', 'house']),
    city: z.string().max(40),
    state: z.enum(STATES),
    price: num(1, 1e10),
    area: num(1, 1e5),
    priceGrowth: pct,
    ageingDrag: pct,
    notaryPct: num(0, 100),
    brokerPct: num(0, 100),
    noBroker: z.boolean(),
    oneOffCosts: num(0, 1e9),
    hausgeld: num(0, 1e4),
    maintenance: num(0, 1e4),
    insurance: num(0, 1e7),
    grundsteuer: num(0, 1e7),
    hessengeldExtension: z.boolean(),
  }),
  mortgage: z.object({
    rateTiers: z.array(num(0, 50)).length(6),
    fixationAdj: z.array(num(-20, 20)).length(4),
    fixationYears: z.union([z.literal(5), z.literal(10), z.literal(15), z.literal(20)]),
    bwDiscount: num(0, 90),
    tilgung: num(0.1, 50),
    sondertilgung: num(0, 100),
    drift: num(-10, 10),
    driftYears: num(0, 100),
    followUpMode: z.enum(['auto', 'manual']),
    followUpRate: num(0, 50),
    financeFees: z.boolean(),
    maxPaymentShare: num(1, 100),
  }),
  sim: z.object({
    horizonMode: z.enum(['year', 'age']),
    horizonYear: num(1900, 2200),
    horizonAge: num(1, 150),
    maxWait: num(0, 100),
    cpi: pct,
    real: z.boolean(),
    liquidate: z.boolean(),
    sellingCosts: num(0, 100),
  }),
});

// Compile-time check that the schema and the engine's Inputs type describe the same shape.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const schemaMatchesInputs: Equals<z.infer<typeof inputsSchema>, Inputs> = true;
void schemaMatchesInputs;

/** Leaf keys of the schema (dotted paths), walked at runtime because TS types do not exist then. */
export function schemaKeys(schema: z.ZodObject = inputsSchema, prefix = ''): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(schema.shape)) {
    if (!prefix && k === 'version') continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (v instanceof z.ZodObject) out.push(...schemaKeys(v, path));
    else out.push(path);
  }
  return out;
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Keep the known keys of `base`, overlaying values from `raw` where the types agree. */
function overlay(base: unknown, raw: unknown): unknown {
  if (isObj(base)) {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(base)) out[k] = isObj(raw) && k in raw ? overlay(base[k], raw[k]) : base[k];
    return out;
  }
  if (Array.isArray(base)) return Array.isArray(raw) ? raw : base;
  return typeof raw === typeof base ? raw : base;
}

/**
 * Bring any stored or imported inputs up to the current schema version. Missing fields take defaults,
 * unknown fields are dropped; returns null when the result does not validate.
 */
export function migrate(raw: unknown, ctx: SimContext): Inputs | null {
  if (!isObj(raw)) return null;
  const version = typeof raw.version === 'number' ? raw.version : 0;
  if (version > SCHEMA_VERSION) return null;
  // Version-specific transforms go here as the schema evolves (v1 is the first published version).
  const merged = overlay(defaultInputs(ctx), raw) as Inputs;
  merged.version = SCHEMA_VERSION;
  const parsed = inputsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as Inputs) : null;
}
