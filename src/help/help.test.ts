import { describe, expect, it } from 'vitest';
import { defaultInputs } from '../engine';
import { de } from '../i18n/de';
import { en } from '../i18n/en';
import { ALL_FIELDS, CHART_KEYS, KPI_KEYS } from '../state/fields';
import { inputsSchema, migrate, schemaKeys } from '../state/schema';
import { buildHelpPrompt } from './prompt';
import { HELP } from './registry';

const ctx = { startYear: 2026, startMonth: 10 };

describe('help coverage', () => {
  const inputKeys = schemaKeys();
  const keys = [...inputKeys, ...KPI_KEYS, ...CHART_KEYS];

  it('walks the Zod schema', () => {
    expect(inputKeys).toContain('you.capital');
    expect(inputKeys).toContain('mortgage.rateTiers');
    expect(inputKeys).not.toContain('version');
  });

  it('every schema input has a UI field and vice versa', () => {
    expect(new Set(ALL_FIELDS.map((f) => f.key))).toEqual(new Set(inputKeys));
  });

  for (const key of keys) {
    it(`${key} has EN + DE help`, () => {
      const entry = HELP[key];
      expect(entry, `registry entry for ${key}`).toBeDefined();
      expect(entry.germanTerm.length).toBeGreaterThan(0);
      expect(entry.extra.en.length).toBeGreaterThan(0);
      expect(entry.extra.de.length).toBe(entry.extra.en.length);
      for (const dict of [en, de] as Record<string, string>[]) {
        expect(dict[`help.${key}.title`], `title for ${key}`).toBeTruthy();
        expect(dict[`help.${key}.short`], `short for ${key}`).toBeTruthy();
      }
      if (entry.hint) {
        expect((en as Record<string, string>)[entry.hint]).toBeTruthy();
        expect((de as Record<string, string>)[entry.hint]).toBeTruthy();
      }
    });
  }
});

describe('buildHelpPrompt', () => {
  const inputs = defaultInputs(ctx);
  // Intl puts a no-break space between number and € in German
  const buildHelp = (...a: Parameters<typeof buildHelpPrompt>) => buildHelpPrompt(...a).replace(/ /g, ' ');
  const pc = { down: 100_000, loan: 300_000, rate: 0.0426, currentYear: 2026, ctx };

  it('EN: term, current value, current year and context', () => {
    const p = buildHelp('mortgage.fixationYears', inputs, 'en', pc);
    expect(p).toContain("Explain 'Zinsbindung' (Sollzinsbindung)");
    expect(p).toContain('My current setting: 10 years');
    expect(p).toContain('typical values in 2026');
    expect(p).toContain('price €400,000');
    expect(p).toContain('down payment €100,000');
    expect(p).toContain('loan €300,000');
    expect(p).toContain('rate 4.26%');
    expect(p).toContain('horizon 2056');
    expect(p).toContain('Berlin');
    expect(p).toContain('Please also answer:');
  });

  it('DE: same content in German', () => {
    const p = buildHelp('mortgage.fixationYears', inputs, 'de', pc);
    expect(p).toContain('Erkläre „Zinsbindung“ (Sollzinsbindung)');
    expect(p).toContain('Meine aktuelle Einstellung: 10 Jahre');
    expect(p).toContain('im Jahr 2026');
    expect(p).toContain('Kaufpreis 400.000 €');
    expect(p).toContain('Darlehen 300.000 €');
    expect(p).toContain('Zins 4,26 %');
    expect(p).toContain('Bitte beantworte außerdem:');
  });

  it('formats numeric fields with their unit', () => {
    expect(buildHelp('property.priceGrowth', inputs, 'en', pc)).toContain('My current setting: 2.5 %/yr');
    expect(buildHelp('you.capital', inputs, 'de', pc)).toContain('Meine aktuelle Einstellung: 120.000 €');
  });
});

describe('schema', () => {
  it('defaults validate', () => {
    expect(inputsSchema.safeParse(defaultInputs(ctx)).success).toBe(true);
  });
  it('migrate fills missing fields and drops unknown ones', () => {
    const raw = JSON.parse(JSON.stringify(defaultInputs(ctx)));
    delete raw.property.grundsteuer;
    raw.property.bogus = 1;
    raw.you.capital = 55_000;
    const m = migrate(raw, ctx)!;
    expect(m.you.capital).toBe(55_000);
    expect(m.property.grundsteuer).toBe(defaultInputs(ctx).property.grundsteuer);
    expect('bogus' in m.property).toBe(false);
  });
  it('migrate rejects invalid data', () => {
    const raw = JSON.parse(JSON.stringify(defaultInputs(ctx)));
    raw.mortgage.rateTiers = [1, 2];
    expect(migrate(raw, ctx)).toBeNull();
    expect(migrate('nope', ctx)).toBeNull();
  });
});
