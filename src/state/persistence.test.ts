import { describe, expect, it } from 'vitest';
import { defaultInputs } from '../engine';
import { exportJson, parseImport, readShareHash, shareHash } from './persistence';

const ctx = { startYear: 2026, startMonth: 10 };

describe('round trips', () => {
  const inputs = defaultInputs(ctx);
  inputs.property.price = 512_345;
  inputs.you.childBirthYears = [2019, 2022];
  inputs.mortgage.rateTiers = [3.1, 3.2, 3.3, 3.4, 3.5, 3.9];

  it('export → import gives identical inputs', () => {
    const back = parseImport(exportJson('My plan', inputs), ctx);
    expect(back?.name).toBe('My plan');
    expect(back?.inputs).toEqual(inputs);
  });

  it('share hash → inputs gives identical inputs', () => {
    const hash = shareHash(inputs, 'Shared');
    expect(hash.startsWith('#s=')).toBe(true);
    const back = readShareHash(hash, ctx);
    expect(back?.name).toBe('Shared');
    expect(back?.inputs).toEqual(inputs);
  });

  it('rejects foreign or broken files and hashes', () => {
    expect(parseImport('{"app":"Other","inputs":{}}', ctx)).toBeNull();
    expect(parseImport('not json', ctx)).toBeNull();
    expect(readShareHash('#s=garbage', ctx)).toBeNull();
    expect(readShareHash('#other', ctx)).toBeNull();
  });
});
