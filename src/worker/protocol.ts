import type {
  BreakevenRow,
  GridCellRef,
  GridResult,
  Inputs,
  ScenarioResult,
  SimContext,
  SimResult,
  StressRow,
  TornadoResult,
} from '../engine';

/** null = follow the optimum; ltv null = best LTV for that month */
export interface Selection {
  month: number;
  ltv: number | null;
}

export interface ComputeRequest {
  type: 'compute';
  jobId: number;
  inputs: Inputs;
  ctx: SimContext;
  selection: Selection | null;
}

export type LineId = 'now' | 'later' | 'never';

export interface PrimaryPayload {
  grid: GridResult;
  now: SimResult | null;
  later: SimResult | null;
  never: SimResult;
  laterCell: GridCellRef | null;
  N: number;
  maxBuy: number;
  horizonYear: number;
}

export interface ScenarioPayload {
  result: ScenarioResult;
  /** which line each strategy / band index belongs to */
  order: LineId[];
  stress: Partial<Record<'now' | 'later', StressRow>>;
}

export type WorkerMessage =
  | { type: 'primary'; jobId: number; data: PrimaryPayload }
  | { type: 'scenarios'; jobId: number; data: ScenarioPayload }
  | { type: 'sensitivity'; jobId: number; data: TornadoResult }
  | { type: 'breakeven'; jobId: number; data: BreakevenRow[] }
  | { type: 'error'; jobId: number; message: string };
