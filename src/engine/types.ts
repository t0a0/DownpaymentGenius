// Engine types. Percent inputs are stored as percent numbers (2.5 = 2.5 %) because that is what the
// UI edits; the engine converts them to decimals in `prepare()`.

export const STATES = [
  'BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH',
] as const;
export type StateCode = (typeof STATES)[number];

export type FundType = 'equity' | 'mixed' | 'bond';
export type PropertyType = 'apartment' | 'house';
export type Household = 'single' | 'couple';
export type FixationYears = 5 | 10 | 15 | 20;
export type FollowUpMode = 'auto' | 'manual';
export type HorizonMode = 'year' | 'age';

export interface Inputs {
  version: number;
  you: {
    /** Invested portfolio today, € */
    capital: number;
    /** Share of today's portfolio value that is unrealised gain, % */
    capitalGainPct: number;
    /** Cash savings today, € */
    cash: number;
    /** Emergency cushion kept in cash, never used for the purchase, € */
    cushion: number;
    /** Monthly savings on top of the cold rent, €/month */
    monthlySavings: number;
    savingsGrowth: number;
    /** Net household income, €/month */
    netIncome: number;
    incomeGrowth: number;
    birthYear: number;
    household: Household;
    churchTax: boolean;
    firstTimeBuyer: boolean;
    childBirthYears: number[];
  };
  invest: {
    expectedReturn: number;
    fundType: FundType;
    cashRate: number;
    basiszins: number;
  };
  rent: {
    coldRent: number;
    rentGrowth: number;
  };
  property: {
    type: PropertyType;
    city: string;
    state: StateCode;
    price: number;
    area: number;
    priceGrowth: number;
    ageingDrag: number;
    notaryPct: number;
    brokerPct: number;
    noBroker: boolean;
    oneOffCosts: number;
    /** Non-recoverable Hausgeld, €/m²/month (apartments) */
    hausgeld: number;
    /** Own maintenance, €/m²/month */
    maintenance: number;
    /** Building insurance, €/year (houses) */
    insurance: number;
    grundsteuer: number;
    hessengeldExtension: boolean;
  };
  mortgage: {
    /** Effective rates for 10y fixation by LTV tier: ≤60, ≤70, ≤80, ≤90, ≤100, >100 % */
    rateTiers: number[];
    /** Surcharge vs 10y fixation in pp, for 5/10/15/20 years */
    fixationAdj: number[];
    fixationYears: FixationYears;
    /** Beleihungswert discount vs purchase price, % */
    bwDiscount: number;
    tilgung: number;
    sondertilgung: number;
    /** Rate drift, pp per year */
    drift: number;
    driftYears: number;
    followUpMode: FollowUpMode;
    followUpRate: number;
    financeFees: boolean;
    maxPaymentShare: number;
  };
  sim: {
    horizonMode: HorizonMode;
    horizonYear: number;
    horizonAge: number;
    maxWait: number;
    cpi: number;
    real: boolean;
    liquidate: boolean;
    sellingCosts: number;
  };
}

/** Month 0 of the simulation is (startYear, startMonth); startMonth is 0-based. */
export interface SimContext {
  startYear: number;
  startMonth: number;
}

/** buyMonth null = never buy. ltv = loan ÷ purchase price (0 = cash purchase). */
export interface Strategy {
  buyMonth: number | null;
  ltv: number;
}

export interface Buckets {
  interest: number;
  rent: number;
  fees: number;
  owner: number;
  taxes: number;
  selling: number;
  returns: number;
  homeGrowth: number;
  subsidies: number;
}

export const LOST_KEYS = ['interest', 'rent', 'fees', 'owner', 'taxes', 'selling'] as const;
export const MADE_KEYS = ['returns', 'homeGrowth', 'subsidies'] as const;

export type Infeasible = 'capital' | 'income' | 'ltv' | 'cashflow';
export const INFEASIBLE_CODES: Infeasible[] = ['capital', 'income', 'ltv', 'cashflow'];

export interface FeeBreakdown {
  grest: number;
  notary: number;
  broker: number;
  oneOff: number;
  total: number;
}

export interface PurchaseInfo {
  month: number;
  price: number;
  fees: FeeBreakdown;
  loan: number;
  equity: number;
  cashNeeded: number;
  bankLtv: number;
  rateEff: number;
  rateNominal: number;
  payment: number;
  paymentShare: number;
  saleTax: number;
  hessengeld: number;
  marginalRate: number | null;
}

export interface RefiInfo {
  month: number;
  balance: number;
  rateEff: number;
  paymentBefore: number;
  paymentAfter: number;
  paymentShare: number;
}

/** One fixed-rate period (Zinsbindung): the purchase loan, then one per refinancing until the loan is repaid. */
export interface LoanPeriod {
  /** month index of the first payment at this rate */
  start: number;
  /** month index of the last payment at this rate */
  end: number;
  /** balance when the period starts */
  balance: number;
  /** effective annual rate (decimal) */
  rateEff: number;
  /** regular monthly payment */
  payment: number;
  interest: number;
  /** repayment incl. Sondertilgung */
  principal: number;
  /** balance left when the period ends: refinanced, or 0 when repaid */
  balanceEnd: number;
}

export interface MonthRow {
  t: number;
  portfolio: number;
  cash: number;
  home: number;
  loan: number;
  /** Net worth at the end of month t, valued per the "liquidate" toggle */
  nw: number;
  /** CPI at the end of month t (1 = today) */
  cpi: number;
}

export interface YearRow {
  year: number;
  budget: number;
  rent: number;
  interest: number;
  principal: number;
  owner: number;
  taxes: number;
  subsidies: number;
  portfolio: number;
  cash: number;
  home: number;
  loan: number;
  nw: number;
  cpi: number;
}

export interface SimResult {
  strategy: Strategy;
  feasible: boolean;
  reason: Infeasible | null;
  /** Net worth at the horizon, nominal, valued per the "liquidate" toggle */
  nw: number;
  moneyIn: number;
  buckets: Buckets;
  cpiH: number;
  purchase: PurchaseInfo | null;
  firstRefi: RefiInfo | null;
  /** Month index (from month 0) when the loan is repaid; may lie past the horizon. null = not within 60 years. */
  debtFreeMonth: number | null;
  /** Fixed-rate periods of the loan (recorded runs only); extended past the horizon when `extend` is set */
  loanPeriods: LoanPeriod[] | null;
  rows: MonthRow[] | null;
  years: YearRow[] | null;
}

export interface GridCellRef {
  month: number;
  ltv: number;
  nw: number;
}

export interface GridResult {
  months: number[];
  ltvs: number[];
  /** nw[ltvIndex][monthIndex], NaN when infeasible */
  nw: Float64Array[];
  /** reason[ltvIndex][monthIndex]: -1 feasible, else index into INFEASIBLE_CODES */
  reason: Int8Array[];
  /** Best LTV index per month, -1 if no feasible LTV */
  bestLtvIdx: Int16Array;
  /** Best net worth per month (NaN if none) */
  timing: Float64Array;
  best: GridCellRef | null;
  buyNow: GridCellRef | null;
  /** Best strategy with buy month > 0 */
  bestWait: GridCellRef | null;
  never: number;
  cpiH: number;
  moneyIn: number;
}
