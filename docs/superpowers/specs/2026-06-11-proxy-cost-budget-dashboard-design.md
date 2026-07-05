# Proxy Cost & Budget dashboard enrichment — design

- **Date:** 2026-06-11 (reconciled 2026-07-05)
- **Status:** Complete — implemented & live-validated. The Cost & Budget tab (11 panels)
  and the Trace Drilldown tab (9 panels) are committed on `feat/proxy-cost-budget-dashboard`;
  all panel queries were validated against a running OpenObserve (see the live-validation
  correction below re: the logs/traces stream split). Remaining: open a PR on request.
- **Author:** Sachin Sharma
- **Area:** `scripts/observability/`, `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`

## Goal

Add first-class **cost & usage** observability to the NeuroLink proxy's OpenObserve
dashboard. Today the dashboard tracks traffic, failures, latency, routing, tokens, and
cache thoroughly, but **cost (USD) is barely surfaced** — and there is no per-account or
per-model cost breakdown, no cache dollar-savings, and no spend/quota forecasting.

The operator runs three OAuth accounts behind the proxy (`fill-first`) and routinely hits
one account's weekly rate-limit ceiling. The missing views are precisely the ones needed
to answer "which account/model is spending what, how much is cache saving us, and are we
about to hit the quota wall."

## Current state

- **Stack:** `proxy → OTEL collector (contrib) → OpenObserve`, defined in
  `scripts/observability/docker-compose.proxy-observability.yaml`. `docker`/`docker-compose`
  on this host are wrappers that exec `/opt/podman/bin/podman`, so the stack runs on Podman.
  Ports: OTLP gRPC `14317→4317`, OTLP HTTP `14318→4318`, OpenObserve UI `:5080`.
- **Proxy already exports OTLP:** `~/.neurolink/.env` has
  `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:14318` (correct for this stack).
- **Dashboard:** `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`. The
  release baseline is 6 tabs / 49 panels; this branch adds the Cost & Budget and Trace
  Drilldown tabs on top.
- **Cost coverage in the baseline:** only two panels, both global totals with no breakdown —
  `Metric Cost in Range (USD)` and `Metric Cost Trend (5m, USD)` (in the "Telemetry
  Cross-Check" tab, sourced from the `proxy_cost_usd_total` metric). The tab named
  **"Tokens, Cache & Cost"** has **no USD cost panel at all** — only tokens/cache.

## Key finding: required data is already emitted (no proxy code change)

From `src/lib/proxy/proxyTracer.ts`:

- **Per-request cost is on every root span:** `ai.cost.total` (USD), computed via
  `calculateCost("anthropic", model, {input, output, total, cacheCreationTokens,
cacheReadTokens})` from `src/lib/utils/pricing.ts` (cache-aware).
- **The `proxy_cost_usd_total` metric carries `{model, account}` labels**
  (proxyTracer.ts:764–795).

**Live-validation correction (2026-07-05).** OpenObserve exposes `neurolink_proxy` as two
separate streams, and the queryable fields are split between them:

- **logs stream:** `account_name`, `account_type`, `ai_model`, `http_method`, and token
  counts (`ai_input_tokens`, `ai_output_tokens`, `ai_cache_*`) — used by the cost panels.
  It does **not** carry `session_id` or `proxy_ratelimit_after_*`.
- **traces stream** (`proxy.request` root span): `proxy_account`, `proxy_ratelimit_after_5h`
  / `_7d`, `session_id`, and `ai_cost_total` (stored as a string → `CAST(... AS DOUBLE)`).
  It does **not** carry `account_name`.

Consequence: the **quota** and **Top Sessions** panels query the **traces** stream and key
off `proxy_account` (not `account_name`); the cost panels stay on the logs stream. Every
panel is still **pure dashboard SQL** — no proxy code change.

## Design decisions

1. **New dedicated "Cost & Budget" tab**, rather than expanding the existing 10-panel
   "Tokens, Cache & Cost" tab into a long scroll. Keeps concerns grouped.
2. **Source breakdowns from the span stream `neurolink_proxy`** (`SUM(ai_cost_total)
GROUP BY …`) — simpler SQL, per-request granularity, and consistent with the existing
   "Tokens by Account / Route" panels. Use the `proxy_cost_usd_total` **metric** only for
   the run-rate projection (counter deltas are more robust for long-window sums).
3. **Deploy by editing the repo's source JSON** and importing that exact file into the
   running OpenObserve via `scripts/observability/import-openobserve-dashboard.mjs`
   (PR-able; does not rely on the packaged copy, which auto-update overwrites).
4. **Keep the two bonus Cost panels** added during implementation — **Total Cost in Range**
   (top-line USD anchor) and **Effective $/1M Tokens by Model** (efficiency lens). They
   complement the approved set and are cheap `SUM`/ratio SQL over the same span stream.
5. **Keep the beyond-spec "Trace Drilldown" tab** (9 span-level panels) built during
   implementation. It reads the same `neurolink_proxy` span stream, rounds out the proxy's
   observability, and is validated live alongside the cost panels.
6. **Label every cost figure "(est.)".** All USD values derive from `pricing.ts` /
   `calculateCost` — a pricing-table estimate from token counts, not invoiced amounts — so
   the "(est., USD)" suffix is applied uniformly. More honest than labelling only some.

## The "Cost & Budget" tab — 11 panels

Final order below. **built** = present in the committed WIP; **NEW** = still to add;
**change** = built but needs a viz change.

| #   | Panel                                 | Viz          | Status | Source & query sketch                                                                   |
| --- | ------------------------------------- | ------------ | ------ | --------------------------------------------------------------------------------------- |
| 1   | Total Cost in Range (est., USD)       | metric       | built  | span: `SUM(ai_cost_total) WHERE http_method IS NOT NULL`                                |
| 2   | Cost per Request (est., USD)          | metric       | built  | span: `SUM(ai_cost_total)/COUNT(*) WHERE http_method IS NOT NULL`                       |
| 3   | Cache $ Savings (est., USD)           | metric       | built  | span: `SUM(ai_cache_read_tokens × input_$/tok × 0.9)` via per-model price `CASE`        |
| 4   | Cost by Account (est., USD)           | bar          | built  | span: `SUM(ai_cost_total) GROUP BY account_name ORDER BY 2 DESC`                        |
| 5   | Cost by Model (est., USD)             | bar          | built  | span: `SUM(ai_cost_total) GROUP BY ai_model`                                            |
| 6   | Cost Trend by Account (5m, est., USD) | stacked area | done   | logs: `histogram(_timestamp,'5 minutes'), account_name, SUM(...)` (line → area)         |
| 7   | Effective $/1M Tokens by Model (est.) | bar          | done   | logs: `SUM(cost)/SUM(ai_tokens_total) × 1e6 GROUP BY ai_model`                          |
| 8   | Projected Daily Spend (est., USD)     | metric       | done   | metric: `SUM(cost_delta)/(max(_ts)-min(_ts)) × 86400`                                   |
| 9   | 7-day Quota Utilization by Account    | bar          | done   | traces: latest `proxy_ratelimit_after_7d` per `proxy_account` via `ROW_NUMBER()`        |
| 10  | 5-hour Quota Utilization by Account   | bar          | done   | traces: latest `proxy_ratelimit_after_5h` per `proxy_account` via `ROW_NUMBER()`        |
| 11  | Top Sessions by Cost (est., USD)      | table        | done   | traces: `session_id, SUM(CAST(ai_cost_total AS DOUBLE)) GROUP BY session_id … LIMIT 20` |

All 11 panels are implemented, and their queries are validated live against real OpenObserve
data (per-account 7d/5h utilisation and top sessions by USD both return real values). Panel 6
renders as a stacked area. The quota panels depend on `proxy_ratelimit_after_*`, which only
Anthropic OAuth responses populate.

## The "Trace Drilldown" tab — 9 panels (built)

Beyond-spec span-level tab, built during implementation and kept (decision 5). All read the
`neurolink_proxy` span stream:

1. Trace Spans in Range (metric)
2. Unique Request Traces (metric)
3. Mean Span Duration (s) (metric)
4. Span Volume by Operation (bar)
5. Span Duration Trend (5m, s) (line)
6. Span Status Mix (bar)
7. Trace Volume Trend (5m) (line)
8. Slowest Operations (s) (bar)
9. Span Kind Mix (bar)

Already committed; validate live alongside the cost panels.

## Execution sequence

**Done:** dashboard rebased onto `origin/release` (9.81.1); Cost & Budget tab (8 panels) and
Trace Drilldown tab (9 panels) built and committed on `feat/proxy-cost-budget-dashboard`.

**Remaining:**

1. **Add 3 panels** to the Cost & Budget tab JSON — 7-day Quota Utilization, 5-hour Quota
   Utilization (gauge/bar), Top Sessions by Cost (table) — matching existing panel idioms.
2. **Switch panel 6** (Cost Trend by Account) from line to stacked area.
3. **Bring up the stack:** `podman machine start`, then `neurolink proxy telemetry setup`
   (starts collector + OpenObserve, imports the current dashboard).
4. **Generate + verify traffic:** route a few proxy requests; confirm data lands in the
   `neurolink_proxy` stream and `proxy_*` metric streams, and that `proxy_ratelimit_after_*`
   appears (Anthropic OAuth). **Capture the exact live column names and the pricing
   constants from `pricing.ts`** — finalize the quota/session/cache SQL against reality.
5. **Re-import** the edited JSON via `scripts/observability/import-openobserve-dashboard.mjs`;
   verify each panel renders with real data.
6. **Commit** the additions on this branch; open a PR (no push without explicit OK).

## Deployment / refresh mechanics

- Edit `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`.
- Import via `node scripts/observability/import-openobserve-dashboard.mjs` (reads that file)
  against `http://localhost:5080`, OpenObserve creds from the compose defaults
  (`<local-user>` / `<local-password>`) unless overridden.
- The running stack's auto-imported copy comes from the installed package; our PR updates
  the repo source of truth so future installs ship the enriched dashboard.

## Risks & caveats

- **Cache $ savings is an estimate.** It duplicates per-model input prices into a SQL
  `CASE` (mirroring `pricing.ts`) and assumes the Anthropic cache-read discount (~0.1×
  input). It will drift if `pricing.ts` changes. Labelled "(est.)" on the panel. Acceptable
  for a savings indicator; exact accounting is out of scope.
- **Run-rate uses the data-span denominator** (`max(_timestamp)-min(_timestamp)`), so it is
  noisy for very short windows; intended for multi-hour ranges.
- **Quota-utilisation panels depend on `proxy_ratelimit_after_*` being populated.** Only
  Anthropic OAuth responses carry these. Confirmed present in code; validated live in
  execution step 4.
- **Resource cost:** two containers on the 8 GB Podman VM (OpenObserve + collector) — a
  modest standing load, acceptable for an on-demand observability stack.

## Acceptance criteria

- "Cost & Budget" tab present with all **11** panels, and the "Trace Drilldown" tab with its
  9 panels, both imported into the running OpenObserve.
- Cost by Account and Cost by Model render non-zero USD breakdowns from real proxy traffic.
- 7-day and 5-hour quota panels show per-account utilisation matching live `/status`.
- Cost Trend by Account renders as a stacked area.
- No change to proxy source code; the existing 49 baseline panels are unaffected.
- Dashboard JSON change committed on `feat/proxy-cost-budget-dashboard`; PR opened on request.

## Out of scope

- Per-request exact cache accounting (counterfactual cost) — estimate only.
- Budget alerting / thresholds (OpenObserve alerts) — future enhancement.
- Any proxy code change to emit new attributes.
- Migrating the stack off Podman or changing ports.
