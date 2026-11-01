// Bank limits at the purchase month: maximum LTV, fees from own cash, income-based cap on the monthly payment.

import type { Model } from './model';
import type { Infeasible } from './types';

export interface BankCheckInput {
  t: number;
  loan: number;
  price: number;
  /** purchase fees incl. one-off costs, € */
  fees: number;
  bankLtv: number;
  payment: number;
}

export function bankCheck(m: Model, c: BankCheckInput): Infeasible | null {
  if (c.bankLtv > m.maxLtv + 1e-9) return 'ltv';
  // Fees come from own cash unless "finance fees" is on; a bank never lends more than price + fees.
  if (c.loan > (m.financeFees ? c.price + c.fees : c.price) + 1e-6) return 'ltv';
  if (c.payment > m.maxShare * m.income[c.t] + 1e-9) return 'income';
  return null;
}

/** Highest monthly payment the bank accepts at month t. */
export const maxPayment = (m: Model, t: number): number => m.maxShare * m.income[t];
