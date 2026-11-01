import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/DownpaymentGenius/',
  plugins: [react()],
  worker: { format: 'es' },
  // ECharts (tree-shaken, SVG renderer) is most of the main chunk; ~350 kB gzipped in total is expected.
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
