# DownpaymentGenius — "Buy now or save and buy later?" (Germany)

## Context
The user saves every month into an investment portfolio and wants to buy a home in Germany. They don't want the
minimum down payment. They want to know **the best moment to buy**: how much should be saved first, and how much of
it should go into the purchase. Waiting builds equity, shrinks the loan and gets a better LTV tier. Buying now avoids
rent, future price growth and rate risk. The repo (`github.com/t0a0/DownpaymentGenius`, branch `master`, **public**, so
Pages works on the free plan) is empty except `LICENSE`. Deliverable: a static, client-only GitHub Pages site at
`https://t0a0.github.io/DownpaymentGenius/`.

## Decisions (settled with the user)
| Topic | Decision |
|---|---|
| Objective | **Least net money lost** = **highest net worth on a fixed horizon date**. Every bucket counts: interest, rent, fees, owner costs, taxes, missed returns |
| Down payment | Optimize **timing × LTV** together (heatmap). LTV 0% = cash purchase; capital not needed for the purchase stays invested |
| Main chart | Two net-worth lines: **buy now** vs **buy at month X** (slider, defaults to optimum; each month uses its best LTV), dotted **never buy** |
| Uncertainty | Base case + **named macro scenarios** as bands + **sensitivity** (tornado) + **breakeven readouts**. No Monte Carlo in v1 |
| Presentation | "Where the money went" bars per scenario + KPIs: total interest, debt-free date, net money lost |
| Horizon | Year or age the user picks (age needs birth year; default today + 30 years), the same date for every scenario |
| Horizon valuation | One toggle **"value as if liquidated"** (default on) applies to **both** assets: portfolio after latent tax, home minus selling costs. Off → both gross |
| Investment tax | Full German rules (Abgeltungsteuer, Soli, church tax, Teilfreistellung, Sparerpauschbetrag, Vorabpauschale, tax on sale), **FIFO lots** |
| Future rates | Today's rate by LTV tier and Zinsbindung + **drift slider** (pp/year, limited duration, floored); follow-up rate after Zinsbindung: auto (re-tiered by LTV + drift) or manual |
| Bank limits | Enforced: income-based rate cap, fees from own cash, max LTV; infeasible months greyed out |
| Property | **Apartment and house** (switchable), existing buildings only (no Neubau/KfW in v1) |
| History | **Lean**: curated stats with sources → slider ranges, scenario presets, "history says" hints, refinancing **stress test**, **city presets** |
| Region | Germany + big cities (presets); Grunderwerbsteuer and church-tax rate per state |
| Persistence | Autosave + named scenarios (localStorage), JSON export/import, share link (URL hash), PDF via print stylesheet |
| Stack | Vite + TypeScript + React, Zustand, ECharts (SVG renderer, tree-shaken `echarts/core`), Vitest, Zod, lz-string, `@fontsource/ibm-plex-sans`; GitHub Actions → Pages |
| Design | Palette **"Clear blue"** (light + dark, colour-blind checked), font **IBM Plex Sans**. Full tokens in "Design" below |
| Language | EN + DE toggle; German terms shown in tooltips in both languages |
| Help | A **"?" on every configurable field** (KPIs too). Hover/tap opens a short explanation popup with a **"Copy AI prompt"** button that copies a ready-made prompt for an AI chat to explain the topic in depth |

## Modeling principles
1. **Equal budget.** Each month every scenario gets the same `budget_t = coldRent_t + savings_t`. A renter pays rent and
   invests the rest. An owner pays the annuity and owner costs and invests what remains, or withdraws if negative (taxed).
2. **Accounting identity** (also a unit test): `NW_H = moneyIn − lost + made`. Here `moneyIn` = start capital + Σbudget
   (identical across scenarios); `lost` = interest + rent + purchase fees + owner costs + taxes (incl. latent tax) + selling
   costs (both only when "value as if liquidated" is on); `made` = portfolio and cushion returns + home value growth +
   subsidies (Hessengeld).
   So "least net lost" ⇔ "most net worth". Missed returns show up as a smaller "made" bar. The identity is defined and
   tested in **nominal** terms. Real mode divides every bucket by `CPI_H`, so the identity still holds (the yearly real
   net-worth line uses `CPI_t`).
3. **Marginal rate.** Show what the last €10k borrowed costs: `(r(L)·L − r(L−10k)·(L−10k)) / 10k`. Compare it with the
   after-tax expected return `r·(1 − TF-adjusted tax)`. This shows why crossing an LTV tier matters.
4. **Only owner-specific costs count.** Shared operating costs (umlagefähige Nebenkosten) cancel out. Compare Kaltmiete with
   non-recoverable Hausgeld, maintenance, Grundsteuer and interest.
5. **Same target property.** The flat bought later is the same one, with its price grown by `g_p`. Its own value grows by
   `g_p − ageing drag` after purchase (the price index is quality-adjusted; a specific ageing building lags it).
6. **Same valuation basis for both assets** (see "Horizon valuation"). Valuing only the portfolio as if sold would bias
   the result toward buying by roughly the selling costs.

## German defaults (Nov 2026, all editable)
- **Grunderwerbsteuer**: BW 5.0 · BY 3.5 · BE 6.0 · BB 6.5 · HB 5.5 (since 07/2025) · HH 5.5 · HE 6.0 · MV 6.0 · NI 5.0 ·
  NW 6.5 · RP 5.0 · SL 6.5 · SN 5.5 · ST 5.0 · SH 6.5 · TH 5.0 (%). Verified Nov 2026: no changes announced for 2026.
- **Hessengeld** (HE only; applies when state = HE and "first-time buyer" is checked, default checked). Rules from the
  official FAQ (Hessisches Finanzministerium, Aug 2025):
  - €10,000 per buyer named in the purchase contract who moves in (max 2 buyers → €20,000), plus €5,000 per child
    under 18 who is already born at notarization and moves in (no limit on children).
  - Capped at the Grunderwerbsteuer actually paid. GrESt must be paid in full first; the grant can't be offset against it.
  - First-time buyers only: no current or past (even partial, inherited or long-sold) residential property or building
    plot anywhere. Existing and new buildings qualify. No income or price limit. Tax-free.
  - Paid in **10 equal annual installments**. The first comes at the next payment date (15 Feb/May/Aug/Nov) after
    approval and proof of move-in; the engine assumes the first installment 6 months after purchase.
  - Payments continue if the owner later sells or moves out.
  - Applications are possible until **31.12.2029** (may be extended). Since GrESt must be paid before applying, purchases
    up to Oct 2029 count; toggle "assume extension" (default off) keeps it for later purchases. This is a real deadline
    effect on the best buy month.
- **Notary + land registry** 2.0%. **Broker, buyer share** 3.57% incl. VAT (max 50% split since 23.12.2020), toggle "no broker" = 0.
- **Mortgage, 10y fixed (eff.)**, best rate by LTV: ≤60% 4.06 · ≤70% 4.16 · ≤80% 4.26 · ≤90% 4.48 · ≤100% 4.71 ·
  >100% 5.21 (Capitalo, as of 11 Sep 2026; their daily 10y average rose ~0.1pp after that, so refresh at implementation).
  - Quoted rates are **effective**; the engine converts to the nominal Sollzins for the monthly annuity:
    `nominal = 12·((1 + eff)^(1/12) − 1)` (4.06% eff ≈ 3.99% nominal).
  - **LTV basis**: confirmed — Capitalo defines Beleihungsauslauf as loan ÷ purchase price. Default Beleihungswert
    discount is therefore 0%. The advanced discount (typical 10–20%) stays for users entering a real bank offer, since
    banks tier on Beleihungswert.
  - **Zinsbindung** 5/10/15/20 years: surcharge/discount vs 10y per fixation, taken from the same source.
  - Advanced toggle **"finance fees"** (off by default): unlocks max LTV 110% and the >100% tier (5.21). With it off,
    fees come from own cash and max LTV is 100%, so that tier is never used.
  - Initial Tilgung 2%, Sondertilgung 0–5%/yr.
- **Rate drift**: pp/year applied for at most `driftYears` (default 5), then flat; rates floored at 0.5%.
- **Refinancing rule**: the follow-up rate (auto) is looked up again by LTV at refinancing (`balance / grown value`) plus
  drift. Keep the monthly payment. If it drops below interest + 1% repayment, raise it to that level.
- **Investment tax**:
  - Abgeltungsteuer with Soli and church tax per §32d EStG: base rate `1/(4 + k)`, then +5.5% Soli and +k church tax.
    Totals: no church tax 26.375% · 8% → ≈27.819% · 9% → ≈27.995%. Church rate follows the state (8% BY/BW, 9% elsewhere).
  - Teilfreistellung 30% equity / 15% mixed / 0% bond, applied to Vorabpauschale **and** to sale gains.
  - Allowance €1,000 single / €2,000 couple, shared by fund income and cushion interest.
  - Vorabpauschale for year Y = Jan-1 value × Basiszins(Y) × 70%, capped at the year's gain, taxed in early January of
    Y+1. Shares bought during Y count pro rata (−1/12 per full month before purchase). Basiszins 2026 = 3.20% (BMF,
    13 Jan 2026); later years default to the same value, editable.
  - **FIFO lots** (one lot per monthly contribution, ≤ 720): each lot tracks cost and accumulated taxed Vorabpauschale,
    which is subtracted from its gain at sale so nothing is taxed twice. The down-payment sale is the biggest tax event,
    and FIFO sells the oldest, highest-gain lots first.
- **Owner costs**: apartment: non-recoverable Hausgeld ~€1.5/m²/mo + own maintenance ~€0.75/m²/mo. House: maintenance ~€1.75/m²/mo
  + building insurance. Grundsteuer €/yr. All grow with CPI.
- **Ageing drag** on the owned property's value growth: default 0.5%/yr (≈ 1%/yr on the building share); set to 0 if the
  maintenance budget is meant to cover modernisation.
- **Bank**: annuity ≤ 35% of net household income (adjustable), max LTV 100% (110% with "finance fees"), fees paid in cash.
- **Sale**: owner-occupied, so no tax on gains. Selling costs at the horizon default 4% (seller broker share + misc),
  deducted only when "value as if liquidated" is on.

## Engine (`src/engine/`, pure TS, monthly loop)
- `types.ts`, `defaults.ts`: typed `Inputs` (schema-versioned), `Strategy {buyMonth | null, ltv}`, `MonthRow`, `Result`.
- `fees.ts`: GrESt table + `purchaseFees()`. `subsidies.ts`: `hessengeld(buyMonth, buyers, childBirthYears, grest)` →
  grant amount (eligible children counted at the purchase month) + installment schedule, 0 after the deadline.
  `rates.ts`: tier lookup (LTV basis + Zinsbindung surcharge),
  capped drift, effective → nominal, `marginalRate()`.
- `mortgage.ts`: annuity step on the nominal rate, yearly Sondertilgung, refinancing at the end of Zinsbindung (re-tiered),
  debt-free month (simulated past the horizon, capped at 60y; only for displayed strategies, not the whole grid).
- `tax.ts`: §32d rate, yearly allowance, FIFO lot store, `sell(net)` → lots consumed + gross + tax, January Vorabpauschale
  (pro rata, tracked per lot), tax on cushion interest, latent tax for valuation.
- `constraints.ts`: bank checks per purchase month (income grows with `incomeGrowth`).
- `simulate.ts`: one strategy → monthly rows, lost/made buckets, nominal + real net worth. Net worth = portfolio (after
  latent tax if liquidating) + cushion + property value (− selling costs if liquidating) − loan.
  - Before buying: pay rent, invest savings, top up the cushion first.
  - At purchase: loan = `ltv × price` (on the chosen LTV basis), equity = price − loan. `sell(net)` raises fees + equity
    from the portfolio above the cushion; the rest stays invested. Not enough capital → infeasible.
  - After buying: invest `budget − annuity − owner costs` (+ Hessengeld installments when due). Negative portfolio → infeasible.
- `optimize.ts`: grid of buy month 0..maxWait×12 (maxWait < horizon) × LTV 0..100% in 5% steps, so the 60/70/80/90/100%
  tier edges are exact grid points. With a Beleihungswert discount, the loans that land exactly on each tier edge are
  added as extra rows. Outputs heatmap, timing curve (best LTV per month), global best, plus the buy-now and never-buy references.
- `sensitivity.ts` (all at quarterly resolution):
  - Tornado: ±range per key input (price growth, rent growth, return, rate drift, follow-up rate, savings), using ranges
    from `history.ts`. Reports Δ best month and Δ net worth. It moves one input at a time, so it ignores co-movement;
    the scenarios below cover that.
  - Scenarios: each named macro scenario from `history.ts` overrides selected inputs, optionally only for the first N
    years. Bands per line = min/max over scenarios.
  - Breakeven: bisection (≤ 10 steps) over the history range of price growth, return, rent growth and rate drift. Finds
    the value where buy now = best wait, and where best buy = never buy. Reports "no flip within range" when there is none.
  - Stress test: follow-up rate +3pp (≈ the 2021→2023 jump). Reports payment, affordability and NW impact.
- Runs in a Web Worker (`src/worker/sim.worker.ts`), debounced about 150 ms. Each request carries a job id, and stale
  results are dropped. The main grid (~121 × 21 runs) is posted first; sensitivity, scenarios and breakeven follow in a
  second message.

## Curated data (`src/data/`)
- `history.ts`: German stats, each with `value`, `source`, `asOf`, compiled at implementation time:
  - 10y mortgage rate: min/max/long-run averages and the largest 2-year change (Bundesbank MFI interest rate statistics,
    housing loans with fixation over 10 years; verify the exact series key, plus the older pre-2003 series).
  - Apartment/house price growth and real-terms episodes (1995–2009 flat, 2022–23 −10–15%), from Destatis HPI 61262,
    Bundesbank/bulwiengesa and GREIX.
  - Rent growth (Destatis Nettokaltmiete CPI sub-index), CPI, long-run world-equity EUR return, volatility and worst year.
  - Named scenarios with coherent co-moving values, e.g. **Rate shock** (rates up ~2–3pp, prices down 10–15% over 2 years,
    after 2022–23), **Stagnation** (flat real prices, after 1995–2009), **Boom** (strong price growth, falling rates,
    after 2010–21), **Base**.
- `cities.ts`: presets for Berlin, München, Hamburg, Köln, Frankfurt, Stuttgart, Düsseldorf, Leipzig, Dresden, Hannover,
  Nürnberg, Bremen and "Germany / other". Each sets the state (GrESt, church tax), default price and rent growth, and
  optional typical €/m² hints, sourced from GREIX/Destatis.
- An "Assumptions & sources" footer on the page lists everything, with a "not financial advice" disclaimer.

## Page (`src/components/`)
- **Header**: `ScenarioMenu` (save / load / rename / delete), Import, Export JSON, Share link, PDF, EN|DE.
- **Left: `InputPanel`**, with collapsible sections and a Basic/Advanced toggle:
  You (capital, monthly savings and growth, net income and income growth, birth year, cushion, single/couple, church tax,
  first-time buyer, children's birth years) ·
  Investments (return, fund type, cash rate, future Basiszins) · Renting (Kaltmiete, growth) · Property (type, city
  preset/state, price, m², price growth, ageing drag, fees, one-off costs, owner costs, Hessengeld "assume extension") · Mortgage (tier
  table, LTV basis / Beleihungswert discount, Zinsbindung, Tilgung, Sondertilgung, drift + drift years, follow-up rate,
  finance fees, bank limits) · Simulation (horizon year/age, max wait, nominal/real, value as if liquidated, selling costs).
  - Each field uses `NumberSlider` (or `Select`/`Toggle`): slider and number box kept in sync, unit, a `HelpTip` "?"
    next to the label, and a "history says" hint.
- **`HelpTip`** (`src/components/HelpTip.tsx`), used on every input, toggle, select, KPI label and chart title:
  - Interaction: opens on hover, with a short delay. It stays open while the pointer is over the popup, so the button
    is clickable. It also opens on focus, and on tap for touch devices. Esc or a tap outside closes it.
    `aria-describedby` for screen readers. The popup is positioned to stay inside the viewport on mobile.
  - Popup content: title, German term (e.g. "Zinsbindung"), a 1–3 sentence explanation, typical German range
    (from `history.ts` where available), and a **"Copy AI prompt"** button that shows "Copied ✓" feedback. It uses
    `navigator.clipboard.writeText` with a textarea fallback.
  - The prompt is built by `buildHelpPrompt(fieldKey, inputs, lang)` in `src/help/prompt.ts`, in the UI language.
    Template: *"I'm using a calculator that decides whether to buy a home in Germany now or keep saving to buy later.
    Explain '{term}' ({germanTerm}) in detail: what it is, how it works in Germany, typical values in {currentYear},
    how it changes the buy-now-vs-wait decision, and common mistakes. My current setting: {value}. Context: price
    {price}, {state}, down payment {down}, loan {loan}, rate {rate}, horizon {year}."* Each field adds a few
    field-specific follow-up questions. Context fields are the user's own inputs and are copied only to the clipboard.
  - Content lives in `src/help/registry.ts`: per key `{ germanTerm, rangeRef?, extraQuestions[] }`, plus i18n keys
    `help.<key>.title|short`. A unit test fails if any input or KPI lacks an entry in EN or DE. Input keys come from
    walking the Zod schema (TS types don't exist at runtime); KPI keys come from an exported `KPI_KEYS` list.
- **Right: results**
  - `KpiStrip`: best moment (date + "in 2y 4m"), down payment €, LTV, rate; net lost best/now/never; total interest;
    debt-free date; payment as % of income; marginal rate of the last €10k.
  - `NetWorthChart`: buy now vs buy at X vs never buy (dotted). Purchase marker, scenario band shading, a "buy in" slider
    and "reset to best".
  - `TimingChart`: net worth at H vs purchase month. LTV tiers shaded, infeasible months greyed, peak marked.
  - `Heatmap`: month × LTV. Tier edges marked. Clicking a cell selects that strategy.
  - `WasteBars`: one row per bucket — lost (interest, rent, fees, owner costs, taxes, selling costs) to the left of zero,
    made (returns, home growth, subsidies) to the right — with one bar per scenario in that scenario's series colour,
    plus a net marker per scenario.
  - `BreakevenList`: one line per input, e.g. "buying now wins if price growth > 3.1%/yr".
  - `SensitivityChart` (tornado), `StressPanel`, `YearlyTable` (collapsible), `AssumptionsFooter`.
- Responsive: one column under 900px, 16px gutters. Light/dark via CSS variables. ECharts can't read CSS variables, so
  chart colors are read with `getComputedStyle` and re-applied when the theme changes; print forces the light theme.

## Design (`src/styles/tokens.css`, `src/charts/theme.ts`)
Palette **"Clear blue"**, chosen by the user. Every colour is a CSS custom property on `:root`; dark values are set under
`@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme="light"])`, and again under
`:root[data-theme="dark"]`, so a manual light/dark toggle wins both ways. Dark mode uses its own steps (below), not an
automatic inversion.

**UI tokens**
| Token | Light | Dark | Use |
|---|---|---|---|
| `--page` | `#f9f9f7` | `#0d0d0d` | Page background |
| `--surface` | `#fcfcfb` | `#1a1a19` | Cards, input panel, chart surface |
| `--text` | `#0b0b0b` | `#f0efec` | Body text, values (15.2:1 dark) |
| `--text-secondary` | `#52514e` | `#c3c2b7` | Labels, help text (7.7:1 / 9.7:1) |
| `--text-muted` | `#898781` | `#898781` | Axis ticks, placeholders only (3.5:1 light — never body text) |
| `--border` | `rgba(11,11,11,0.10)` | `rgba(255,255,255,0.10)` | Hairlines, card rings |
| `--grid` | `#e1e0d9` | `#2c2c2a` | Chart gridlines |
| `--axis` | `#c3c2b7` | `#383835` | Chart baseline/axis |
| `--accent` | `#2a78d6` | `#3987e5` | Slider track/thumb, focus ring, selected states |
| `--accent-text` | `#256abf` | `#6da7ec` | Links and accent text (5.3:1 / 7.0:1) |
| `--button` / `--on-button` | `#256abf` / `#ffffff` | `#256abf` / `#ffffff` | Primary button (5.4:1) |

**Chart colours** (the three scenarios keep the same colour in every chart)
| Role | Light | Dark | Mark |
|---|---|---|---|
| Buy now | `#2a78d6` | `#3987e5` | 2px solid line / bar |
| Buy at month X | `#eb6834` | `#d95926` | 2px solid line / bar |
| Never buy | `#1baf7a` | `#199e70` | 2px **dotted** line / bar |
| Scenario bands | series colour at 15% opacity | same | Area between scenario min/max |
| Purchase marker | `--text-muted` hairline + label | same | Vertical rule at purchase month |

- Validated with the dataviz palette checker (all pairs, both modes): CVD ΔE ≥ 9.2 light / 9.4 dark, normal-vision
  ΔE ≥ 24.0 / 20.9. Light-mode "never buy" green is 2.74:1 on the surface, so lines carry **direct end labels** and
  the yearly table is the text alternative; the dotted pattern is the second cue.
- **Heatmap** (sequential blue, light → dark = worse → better net worth): `#cde2fb` `#b7d3f6` `#9ec5f4` `#86b6ef`
  `#6da7ec` `#5598e7` `#3987e5` `#2a78d6` `#256abf` `#1c5cab` `#184f95` `#104281` `#0d366b`. Infeasible cells: `--grid`
  fill with a 45° line texture. Selected and best cells: 2px `--text` ring. Tier edges: `--axis` hairlines.
- **Tornado**: low end of the input range `#86b6ef`, high end `#1c5cab` (two steps of the same blue), centred on the
  base-case net worth.
- **Status** (affordability, infeasible, stress-test warnings): good `#0ca30c`, warning `#fab219`, serious `#ec835a`,
  critical `#d03b3b`, same in both modes, always with an icon and a text label, never colour alone.
- **Marks**: 2px lines, ≥ 8px point markers, bars with 4px rounded data ends and a 2px surface gap, recessive
  gridlines, one y-axis per chart, a legend whenever there are ≥ 2 series, hover tooltips on every chart (crosshair on
  line charts, per-cell on the heatmap). Values and labels use text tokens, never the series colour.

**Typography**
- **IBM Plex Sans**, weights 400 and 500 only (500 for headings, KPI values and emphasis), self-hosted via
  `@fontsource/ibm-plex-sans` (latin subset covers ä ö ü ß €). Stack:
  `"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif`. ECharts `textStyle.fontFamily` uses the same stack.
- Sizes: 12 (axis, captions) · 13 (help popups, table) · 14 (inputs, labels) · 16 (body) · 20 (section titles) ·
  28 (KPI values) px; line height 1.5 for body text.
- `font-variant-numeric: tabular-nums` on every number that updates while a slider moves (KPIs, number boxes, the
  yearly table, axis ticks) so digits don't jitter.
- Numbers and dates are formatted with `Intl.NumberFormat` / `Intl.DateTimeFormat` per locale
  (de: `412.350 €`, `4,26 %`; en: `€412,350`, `4.26%`).

## Persistence, sharing, PDF, i18n (`src/state/`, `src/i18n/`)
- `store.ts` (Zustand): inputs + selected strategy. `schema.ts`: Zod schema + `migrate(version)`.
- `persistence.ts`:
  - Debounced autosave (`dg:current`) and named scenarios (`dg:scenarios`); every storage access wrapped in try/catch.
    The `dg:` prefix matters because all `t0a0.github.io` project sites share one localStorage origin.
  - Export/import `{app, schemaVersion, name, inputs}`.
  - Share link `#s=<lz-string>`. An opened link loads as an unsaved scenario and never overwrites the autosave.
- PDF: `print.css` hides controls and prints an inputs summary, KPIs, charts (SVG) and the yearly table. Charts are resized on
  `beforeprint`; the button calls `window.print()`.
- i18n: `en.ts`/`de.ts` dictionaries, `t(key)`, `Intl.NumberFormat` (EUR) per locale, language saved in localStorage.

## Build & deploy
- `vite.config.ts` with `base: '/DownpaymentGenius/'`. Scripts: `dev`, `build`, `preview`, `test`. Commit
  `package-lock.json` (needed by `npm ci`).
- `.github/workflows/deploy.yml`: on push to `master`, run `npm ci` → `npm test` → `npm run build` → `configure-pages` →
  `upload-pages-artifact` → `deploy-pages`, with `permissions: { contents: read, pages: write, id-token: write }`.
  One-time manual step by the user: repo Settings → Pages → Source: GitHub Actions.
- `README.md`: method, assumptions, sources, disclaimer. `.claude/launch.json` for `npm run dev` preview.

## Implementation order
1. Scaffold Vite/React/TS, Vitest, deploy workflow, i18n skeleton (`t()`, empty `en.ts`/`de.ts`), design tokens
   (`tokens.css`, light + dark) and the IBM Plex Sans font.
2. Engine + unit tests (fees, rates, mortgage, tax incl. FIFO, constraints, simulate, optimize, sensitivity, breakeven).
3. Curated `history.ts` (stats + named scenarios) + `cities.ts` with sources.
4. Store + worker + `InputPanel`/`NumberSlider` + `HelpTip` (registry, prompt builder, EN/DE help texts) +
   `KpiStrip` + `NetWorthChart` + `TimingChart`.
5. Heatmap, WasteBars, BreakevenList, YearlyTable, Sensitivity, Stress.
6. Persistence (autosave, scenarios, JSON, share link) + print/PDF.
7. Full DE UI translation, mobile, dark mode, README.

## Verification
- `npm test` (Vitest):
  - Annuity: €200k at 4% nominal with 2% Tilgung gives €1,000/month, and the 10-year balance matches an independent amortization calc.
  - Effective → nominal: 4.06% eff gives ≈ 3.986% nominal.
  - Fees: €300k in NRW with 2% notary and 3.57% broker gives €36,210.
  - Hessengeld (official FAQ examples, 6% GrESt): 2 buyers + 2 children at €400k → €24,000 (GrESt cap, €2,400/yr);
    at €500k → €30,000; at €600k → €30,000. 1 buyer + 2 children with €15,000 GrESt → €15,000. A child who turns 18
    before the purchase month no longer counts. Purchase after Oct 2029 → €0 unless "assume extension".
  - Tier boundaries (price and Beleihungswert basis), Zinsbindung surcharge, re-tiering at refinancing, and the marginal rate.
  - Tax rate: 26.375% without church tax, ≈27.819% at 8%, ≈27.995% at 9%.
  - Vorabpauschale: €100k at 3.2% gives €2,240 base, €1,568 taxable and ≈€413.6 tax before the allowance; a lot bought
    in July counts 6/12.
  - FIFO: a partial sale consumes the oldest lots first; Vorabpauschale already taxed lowers the sale gain (no double tax).
  - The accounting identity holds for every strategy, nominal and real, with liquidation on and off.
  - Zero rates, returns, growth, fees and taxes, **with rent equal to owner costs**, make buy-now and buy-later equal.
  - Rate ≫ return → lowest feasible LTV. Return ≫ rate without tier surcharges → highest feasible LTV.
    High price growth + high rent → buy now.
  - Infeasible cells are masked; LTV 0% with capital > price + fees is feasible and leaves the rest invested.
  - Breakeven: at the reported value, the two compared strategies' net worth matches within €1.
  - Help coverage: every input (from the Zod schema) and KPI has EN+DE help.
  - `buildHelpPrompt` contains the term, the current value, the current year and the context, in the UI language.
- Browser pane (`npm run dev`):
  - Sliders and number boxes stay in sync, and the charts update without lag; fast slider drags never show stale results.
  - Clicking a heatmap cell sets the strategy.
  - "?" popups open on hover, focus and tap, stay open while you move into them, and "Copy AI prompt" puts the
    prompt on the clipboard.
  - Layout works at 375px, in dark mode (charts follow the theme) and with the EN/DE toggle.
  - Print preview produces a clean, light PDF.
- Round trips: export → import gives identical inputs; a share link in a fresh tab reproduces the setup; a reload keeps the autosave.
- Cross-check one loan schedule against a public Tilgungsrechner (Interhyp or Dr. Klein), entering the same effective rate.
- After pushing, the Action is green and the site loads at `https://t0a0.github.io/DownpaymentGenius/`.

## Later (not v1)
Monte Carlo · full historical backtest and regret map · Neubau + KfW programs · two-income couples with separate allowances ·
user-drawn custom rate/price paths.
