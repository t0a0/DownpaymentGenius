export * from './types';
export * from './defaults';
export * from './util';
export * from './fees';
export * from './subsidies';
export * from './rates';
export * from './mortgage';
export * from './tax';
export * from './constraints';
export * from './model';
export * from './simulate';
export * from './optimize';
export * from './sensitivity';

import type { Buckets } from './types';

/** Divide every bucket by CPI at the horizon (real mode); the accounting identity still holds. */
export function scaleBuckets(b: Buckets, factor: number): Buckets {
  return {
    interest: b.interest * factor,
    rent: b.rent * factor,
    fees: b.fees * factor,
    owner: b.owner * factor,
    taxes: b.taxes * factor,
    selling: b.selling * factor,
    returns: b.returns * factor,
    homeGrowth: b.homeGrowth * factor,
    subsidies: b.subsidies * factor,
  };
}
