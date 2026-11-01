// Main-thread side of the worker: debounced requests, job ids, stale results dropped in the store.

import { useStore } from '../state/store';
import type { ComputeRequest, WorkerMessage } from './protocol';

const INPUT_DEBOUNCE_MS = 150;
const SELECTION_DEBOUNCE_MS = 30;

export function startEngine(): () => void {
  const worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' });
  let jobId = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const post = () => {
    jobId++;
    const s = useStore.getState();
    s.markRequested(jobId);
    const req: ComputeRequest = { type: 'compute', jobId, inputs: s.inputs, ctx: s.ctx, selection: s.selection };
    worker.postMessage(req);
  };
  const schedule = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(post, ms);
  };

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => useStore.getState().receive(e.data);
  worker.onerror = (e) => useStore.getState().receive({ type: 'error', jobId, message: e.message });

  const unsub = useStore.subscribe((s, prev) => {
    if (s.inputs !== prev.inputs || s.ctx !== prev.ctx) schedule(INPUT_DEBOUNCE_MS);
    else if (s.selection !== prev.selection) schedule(SELECTION_DEBOUNCE_MS);
  });
  post();
  return () => {
    unsub();
    clearTimeout(timer);
    worker.terminate();
  };
}
