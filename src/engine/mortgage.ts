// Annuity loan with fixed-rate periods (Zinsbindung), yearly Sondertilgung and refinancing.

import type { LoanPeriod } from './types';

export interface LoanState {
  balance: number;
  original: number;
  start: number;
  /** nominal annual rate (decimal) */
  nominal: number;
  /** effective annual rate (decimal) */
  eff: number;
  payment: number;
  /** month index of the next refinancing */
  fixEnd: number;
  fixMonths: number;
  /** yearly Sondertilgung as a share of the original loan */
  sonder: number;
  refinanced: number;
}

export interface RefiEvent {
  paymentBefore: number;
  paymentAfter: number;
  balance: number;
  eff: number;
}

export interface LoanStep {
  interest: number;
  principal: number;
  extra: number;
  /** set in the month the loan was refinanced */
  refi: RefiEvent | null;
}

/** Add one loan month to the period list; a refinancing (or the first payment) opens a new period. */
export function trackPeriod(periods: LoanPeriod[], l: LoanState, t: number, st: LoanStep): void {
  let p = periods[periods.length - 1];
  if (!p || st.refi) {
    p = {
      start: t,
      end: t,
      balance: l.balance + st.principal + st.extra,
      rateEff: l.eff,
      payment: l.payment,
      interest: 0,
      principal: 0,
      balanceEnd: 0,
    };
    periods.push(p);
  }
  p.end = t;
  p.interest += st.interest;
  p.principal += st.principal + st.extra;
  p.balanceEnd = l.balance;
}

/** German annuity: monthly payment = loan × (Sollzins + initial Tilgung) / 12. */
export const annuityPayment = (loan: number, nominal: number, tilgung: number): number =>
  (loan * (nominal + tilgung)) / 12;

/** At refinancing the payment is kept, but raised to at least interest + 1 % repayment. */
export const MIN_REFI_TILGUNG = 0.01;

export function openLoan(
  amount: number,
  eff: number,
  nominal: number,
  tilgung: number,
  sonder: number,
  start: number,
  fixMonths: number,
): LoanState {
  return {
    balance: amount,
    original: amount,
    start,
    nominal,
    eff,
    payment: annuityPayment(amount, nominal, tilgung),
    fixEnd: start + fixMonths,
    fixMonths,
    sonder,
    refinanced: 0,
  };
}

export const cloneLoan = (l: LoanState): LoanState => ({ ...l });

/**
 * One month of the loan. `refiEff(t, balance)` returns the effective follow-up rate at month t.
 * Interest accrues on the balance at the start of the month; Sondertilgung is paid at the end of each loan year.
 */
export function loanStep(
  l: LoanState,
  t: number,
  refiEff: (t: number, balance: number) => number,
  toNominal: (eff: number) => number,
): LoanStep {
  let refi: RefiEvent | null = null;
  if (l.balance <= 0) return { interest: 0, principal: 0, extra: 0, refi };
  if (t === l.fixEnd) {
    const eff = refiEff(t, l.balance);
    const nominal = toNominal(eff);
    const before = l.payment;
    l.eff = eff;
    l.nominal = nominal;
    l.payment = Math.max(l.payment, (l.balance * (nominal + MIN_REFI_TILGUNG)) / 12);
    l.fixEnd += l.fixMonths;
    l.refinanced++;
    refi = { paymentBefore: before, paymentAfter: l.payment, balance: l.balance, eff };
  }
  const interest = (l.balance * l.nominal) / 12;
  const principal = Math.min(l.payment - interest, l.balance);
  l.balance -= principal;
  let extra = 0;
  if (l.sonder > 0 && l.balance > 0 && (t - l.start + 1) % 12 === 0) {
    extra = Math.min(l.sonder * l.original, l.balance);
    l.balance -= extra;
  }
  if (l.balance < 0.005) l.balance = 0;
  return { interest, principal, extra, refi };
}
