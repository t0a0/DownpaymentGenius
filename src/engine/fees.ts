import type { FeeBreakdown, StateCode } from './types';

/** Grunderwerbsteuer by state, % (verified Nov 2026; HB 5.5 since 07/2025). */
export const GREST: Record<StateCode, number> = {
  BW: 5.0, BY: 3.5, BE: 6.0, BB: 6.5, HB: 5.5, HH: 5.5, HE: 6.0, MV: 6.0,
  NI: 5.0, NW: 6.5, RP: 5.0, SL: 6.5, SN: 5.5, ST: 5.0, SH: 6.5, TH: 5.0,
};

/** Church tax rate by state: 8 % in Bavaria and Baden-Württemberg, 9 % elsewhere. */
export const churchRate = (state: StateCode): number => (state === 'BY' || state === 'BW' ? 0.08 : 0.09);

/** Decimal fee rates applied to the purchase price. */
export interface FeeRates {
  grest: number;
  notary: number;
  broker: number;
}

export function feeRates(state: StateCode, notaryPct: number, brokerPct: number, noBroker: boolean): FeeRates {
  return { grest: GREST[state] / 100, notary: notaryPct / 100, broker: noBroker ? 0 : brokerPct / 100 };
}

export function purchaseFees(price: number, rates: FeeRates, oneOff = 0): FeeBreakdown {
  const grest = price * rates.grest;
  const notary = price * rates.notary;
  const broker = price * rates.broker;
  return { grest, notary, broker, oneOff, total: grest + notary + broker + oneOff };
}
