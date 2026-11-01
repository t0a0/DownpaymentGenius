// Hessengeld, per the official FAQ of the Hessisches Ministerium der Finanzen (Aug 2025).

export const HESSENGELD = {
  perBuyer: 10_000,
  maxBuyers: 2,
  perChild: 5_000,
  installments: 10,
  /** The engine assumes the first installment 6 months after purchase. */
  firstAfterMonths: 6,
  /** Applications until 31.12.2029; GrESt must be paid first, so purchases up to Oct 2029 count. */
  lastPurchase: { year: 2029, month: 9 },
};

/** Birthdays are assumed on 1 July of the birth year (only the year is entered). */
export function childCounts(birthYear: number, purchaseYear: number, purchaseMonth: number): boolean {
  const p = purchaseYear * 12 + purchaseMonth;
  const born = birthYear * 12 + 6;
  return p >= born && p < born + 18 * 12;
}

export interface HessengeldInput {
  purchaseYear: number;
  purchaseMonth: number;
  buyers: number;
  childBirthYears: number[];
  /** Grunderwerbsteuer actually paid, € */
  grest: number;
  assumeExtension: boolean;
}

export interface HessengeldResult {
  total: number;
  perInstallment: number;
  installments: number;
  eligibleChildren: number;
}

export function hessengeld(o: HessengeldInput): HessengeldResult {
  const none = { total: 0, perInstallment: 0, installments: 0, eligibleChildren: 0 };
  const last = HESSENGELD.lastPurchase.year * 12 + HESSENGELD.lastPurchase.month;
  if (!o.assumeExtension && o.purchaseYear * 12 + o.purchaseMonth > last) return none;
  const children = o.childBirthYears.filter((y) => childCounts(y, o.purchaseYear, o.purchaseMonth)).length;
  const buyers = Math.min(Math.max(o.buyers, 0), HESSENGELD.maxBuyers);
  const total = Math.min(buyers * HESSENGELD.perBuyer + children * HESSENGELD.perChild, Math.max(0, o.grest));
  return {
    total,
    perInstallment: total / HESSENGELD.installments,
    installments: total > 0 ? HESSENGELD.installments : 0,
    eligibleChildren: children,
  };
}
