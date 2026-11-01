import type { Inputs, PropertyType, SimContext } from './types';

export const SCHEMA_VERSION = 1;

/** Own maintenance default by property type, €/m²/month */
export const MAINTENANCE_DEFAULT: Record<PropertyType, number> = { apartment: 0.75, house: 1.75 };

/** Mortgage rates as of 11 Sep 2026 (Capitalo best rates, 10y fixation, effective, by loan ÷ price). */
export const RATE_TIERS_DEFAULT = [4.06, 4.16, 4.26, 4.48, 4.71, 5.21];
/** Zinsbindung surcharge vs 10y in pp (Capitalo, 18 Sep 2026, averaged over ≤60 % and ≤80 %). */
export const FIXATION_ADJ_DEFAULT = [-0.05, 0, 0.25, 0.45];
export const RATES_AS_OF = '2026-09-11';

export function defaultContext(now = new Date()): SimContext {
  return { startYear: now.getFullYear(), startMonth: now.getMonth() };
}

export function defaultInputs(ctx: SimContext = defaultContext()): Inputs {
  return {
    version: SCHEMA_VERSION,
    you: {
      capital: 120_000,
      capitalGainPct: 10,
      cash: 10_000,
      cushion: 10_000,
      monthlySavings: 1_500,
      savingsGrowth: 2,
      netIncome: 5_500,
      incomeGrowth: 2,
      birthYear: 1992,
      household: 'single',
      churchTax: false,
      firstTimeBuyer: true,
      childBirthYears: [],
    },
    invest: {
      expectedReturn: 6,
      fundType: 'equity',
      cashRate: 2,
      basiszins: 3.2,
    },
    rent: {
      coldRent: 1_300,
      rentGrowth: 2.5,
    },
    property: {
      type: 'apartment',
      city: 'berlin',
      state: 'BE',
      price: 400_000,
      area: 80,
      priceGrowth: 2.5,
      ageingDrag: 0.5,
      notaryPct: 2,
      brokerPct: 3.57,
      noBroker: false,
      oneOffCosts: 5_000,
      hausgeld: 1.5,
      maintenance: MAINTENANCE_DEFAULT.apartment,
      insurance: 0,
      grundsteuer: 0,
      hessengeldExtension: false,
    },
    mortgage: {
      rateTiers: [...RATE_TIERS_DEFAULT],
      fixationAdj: [...FIXATION_ADJ_DEFAULT],
      fixationYears: 10,
      bwDiscount: 0,
      tilgung: 2,
      sondertilgung: 0,
      drift: 0,
      driftYears: 5,
      followUpMode: 'auto',
      followUpRate: 4.5,
      financeFees: false,
      maxPaymentShare: 35,
    },
    sim: {
      horizonMode: 'year',
      horizonYear: ctx.startYear + 30,
      horizonAge: 67,
      maxWait: 10,
      cpi: 2,
      real: false,
      liquidate: true,
      sellingCosts: 4,
    },
  };
}
