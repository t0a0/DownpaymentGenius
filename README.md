# DownpaymentGenius

**Buy a home in Germany now, or keep saving and buy later?**
A static, client-only calculator that finds the purchase month and loan size that leave you with the highest net
worth on a date you choose. Live at <https://t0a0.github.io/DownpaymentGenius/>.

Nothing leaves your browser: inputs are autosaved to `localStorage`, and share links carry the inputs in the URL hash.

## Method

- **Equal budget.** Every strategy gets the same monthly budget: cold rent + savings. Renters pay rent and invest the
  rest; owners pay the annuity and owner costs and invest what remains (or sell, taxed, when it is negative).
- **Accounting identity.** Net worth at the horizon = money in − lost + made. *Lost* is interest, rent, purchase fees,
  owner costs, taxes (incl. latent tax) and selling costs; *made* is investment returns, home value growth and
  subsidies (Hessengeld). The least net money lost is therefore the highest net worth. A unit test checks the identity
  for every kind of strategy, nominal and real, with and without "value as if liquidated".
- **Search.** Every purchase month up to the maximum wait × every LTV from 0 % (cash purchase) to the bank maximum in
  5 % steps (rate-tier edges are exact grid points). Infeasible combinations — too little capital, payment above the
  bank's income limit, LTV above the maximum, or a budget that cannot carry the costs — are masked.
- **Same valuation basis.** With "value as if liquidated" on, the portfolio is valued after the tax a sale would cost
  and the home after selling costs; off, both are gross.
- **Uncertainty.** Named macro scenarios (rate shock, stagnation, boom) as bands, a tornado over historical ranges,
  breakeven values, and a refinancing stress test (+3 pp). No Monte Carlo in v1.

## German rules modelled

- Grunderwerbsteuer per state (Nov 2026), notary + land registry, buyer's broker share (max 50 % since 12/2020).
- Mortgage: effective rates by LTV tier and Zinsbindung (converted to the nominal Sollzins), annuity with initial
  Tilgung, yearly Sondertilgung, refinancing re-tiered by balance ÷ current value, optional Beleihungswert discount,
  "finance fees" (110 %), rate drift with a 0.5 % floor.
- Investment tax: Abgeltungsteuer + Soli + church tax (§32d EStG), Teilfreistellung, Sparerpauschbetrag,
  Vorabpauschale (pro rata for units bought during the year, tracked per lot) and FIFO lots so nothing is taxed twice.
- Hessengeld: €10,000 per buyer (max 2) + €5,000 per child, capped at the GrESt paid, 10 annual installments,
  purchases up to Oct 2029 unless "assume extension".
- Owner-occupied: no tax on the sale. Existing buildings only (no Neubau/KfW).

## Assumptions to keep in mind

- Shared operating costs (umlagefähige Nebenkosten) cancel out between renting and owning. Grundsteuer and building
  insurance are usually passed on to tenants too, so their defaults are €0; enter only what owning costs you on top.
- The home bought later is the same one, its price grown by the price growth. After purchase its value grows by price
  growth minus an ageing drag (0.5 %/yr by default).
- Children's birthdays are assumed on 1 July (only the year is entered).
- Default rates: Capitalo best rates as of 11 Sep 2026; Zinsbindung surcharges from 18 Sep 2026. Refresh them in
  the Advanced mode before relying on the result.

## Sources

Curated in [`src/data/history.ts`](src/data/history.ts) with source and as-of date for each figure: Deutsche
Bundesbank MFI interest rate statistics (SUD119, `BBIM1.M.DE.B.A2C.P.R.A.2250.EUR.N`) and residential property
prices, Destatis house price index (61262) and CPI incl. net cold rents (61111), GREIX, MSCI World (EUR), BMF
(Basiszins 2026 = 3.20 %), the Hessengeld FAQ of the Hessian Ministry of Finance, and Capitalo for current rates.

## Disclaimer

Not financial, tax or legal advice. This is a model with simplifications. Check the numbers with a bank, a tax
adviser and current offers before you decide.

## Development

```bash
npm install
npm run dev      # http://localhost:5173/DownpaymentGenius/
npm test         # Vitest: engine, tax, Hessengeld, accounting identity, help coverage, round trips
npm run build    # type-check + production build into dist/
```

Stack: Vite, TypeScript, React, Zustand, ECharts (tree-shaken, SVG renderer), Zod, lz-string, IBM Plex Sans.
The simulation runs in a Web Worker (`src/worker/sim.worker.ts`); the engine in `src/engine/` is pure TypeScript.

| Path | What |
|---|---|
| `src/engine/` | Monthly simulation, tax lots, mortgage, grid search, sensitivity, breakeven, stress test |
| `src/data/` | Curated history, named scenarios, city presets |
| `src/state/` | Zod schema + migration, store, autosave, scenarios, JSON, share links |
| `src/help/` | Help registry (German terms, follow-up questions) and the "Copy AI prompt" builder |
| `src/components/`, `src/charts/` | UI and charts |

## Deployment

Pushing to `master` runs `.github/workflows/deploy.yml` (`npm ci` → `npm test` → `npm run build` → GitHub Pages).
One-time setup: repository **Settings → Pages → Source: GitHub Actions**.
