# Proxy Cost & Budget Dashboard — Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the proxy "Cost & Budget" tab (8 → 11 panels), switch the Cost Trend panel to stacked area, then validate every new panel against live OpenObserve data.

**Architecture:** Pure OpenObserve dashboard-JSON edits — no proxy code. New panels are authored by cloning existing Cost & Budget panels (reusing their exact inline pricing `CASE` SQL and config boilerplate) and changing only id / title / layout / query / type. Validation runs the local Podman → OTEL collector → OpenObserve stack, routes proxy traffic, and confirms each panel renders.

**Tech Stack:** OpenObserve v5 dashboard schema, DataFusion SQL, Node.js (`.mjs` scripts), Podman, pnpm.

## Global Constraints

- No proxy source-code changes; the existing 49 baseline panels stay byte-identical (only the "Cost & Budget" tab's `panels` array is edited).
- Cost panels keep the `(est., USD)` label; their USD is computed via the **inline per-model pricing `CASE`** used by `Panel_cost_04` (mirrors `src/lib/utils/pricing.ts`). The trace-backed quota/session panels instead read `proxy_account` and the proxy-computed `ai_cost_total`.
- Package manager is **pnpm**. Run node scripts with `node`.
- The pre-commit hook (`pre-commit.sh`) runs the full `check + format:staged + lint + validate:all + build` gate and then **force-stages every modified tracked file**. Before committing, ensure the dashboard JSON is the only modified tracked file so nothing unintended is swept in.
- No `git push` / PR without explicit user OK.
- Dashboard file: `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`.
- Grid is 48 columns. Built Cost & Budget panels occupy `y=0..33`; next free row is `y=34`. New ids: `Panel_cost_09/10/11`, layout `i` = `9009/9010/9011`.

---

## Implementation outcome (2026-07-05)

**Both tasks are DONE.** Task 1 (panels) is committed as `1fd57e33`; Task 2 (live validation)
ran against a local OpenObserve. Two corrections vs. the plan as written below:

1. **Stream split.** The three new panels query the **traces** stream, not logs. Live
   validation showed `session_id` and `proxy_ratelimit_after_*` live only on the traces
   `proxy.request` root span (together with `proxy_account` and `ai_cost_total`), while the
   logs stream carries `account_name` + token counts. So the quota panels key off
   `proxy_account` (not `account_name`) and `CAST(ai_cost_total AS DOUBLE)`; the cost panels
   stay on logs. All three queries returned real data — per-account 7-day/5-hour utilisation
   and top sessions by USD.
2. **Baseline is 49 panels (6 tabs).** The illustrative script
   below asserts the baseline stays unchanged during this edit (49 → 49).

Panels were inserted as raw text (not `JSON.parse`→`stringify`) so the 66 existing panels
stay byte-identical — the committed diff is +349/−1, no `0.0`→`0` churn.

---

### Task 1: Complete the Cost & Budget tab JSON (add 3 panels + stacked-area flip)

**Files:**

- Modify: `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json` (the "Cost & Budget" tab `panels` array only)

**Interfaces:**

- Consumes: existing panels `Panel_cost_04` (bar template — its query holds the reusable pricing `CASE`) and `Panel_cost_06` (the Cost Trend line panel to flip).
- Produces: panels `Panel_cost_09` (7-day Quota Utilization, bar), `Panel_cost_10` (5-hour Quota Utilization, bar), `Panel_cost_11` (Top Sessions by Cost, table); `Panel_cost_06.type = "area-stacked"`.

- [ ] **Step 1: Write the failing validation check**

Save as `/tmp/validate-cost-tab.mjs` (scratch, not committed):

```js
import { readFileSync } from "node:fs";
const P = "docs/assets/dashboards/neurolink-proxy-observability-dashboard.json";
const j = JSON.parse(readFileSync(P, "utf8"));
const cb = j.v5.tabs.find((t) => t.name === "Cost & Budget");
if (!cb) {
  console.error('FAIL: missing "Cost & Budget" tab');
  process.exit(1);
}
const byId = Object.fromEntries(cb.panels.map((p) => [p.id, p]));
const errs = [];
if (cb.panels.length !== 11)
  errs.push(`expected 11 panels, got ${cb.panels.length}`);
if (byId.Panel_cost_06?.type !== "area-stacked")
  errs.push(
    `Panel_cost_06 type = ${byId.Panel_cost_06?.type}, want area-stacked`,
  );
for (const [id, type] of [
  ["Panel_cost_09", "bar"],
  ["Panel_cost_10", "bar"],
  ["Panel_cost_11", "table"],
]) {
  if (!byId[id]) errs.push(`missing ${id}`);
  else if (byId[id].type !== type)
    errs.push(`${id} type = ${byId[id].type}, want ${type}`);
}
// baseline untouched: all other tabs still total 49 panels
const others = j.v5.tabs.filter(
  (t) => !["Cost & Budget", "Trace Drilldown"].includes(t.name),
);
const base = others.reduce((n, t) => n + t.panels.length, 0);
if (base !== 49)
  errs.push(`baseline panels = ${base}, want 49 (do not touch other tabs)`);
if (errs.length) {
  console.error("FAIL:\n" + errs.join("\n"));
  process.exit(1);
}
console.log(
  "PASS: 11 Cost & Budget panels, area-stacked trend, 49 baseline untouched",
);
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node /tmp/validate-cost-tab.mjs`
Expected: `FAIL: expected 11 panels, got 8` (and the area-stacked / missing-panel lines).

- [ ] **Step 3: Write the panel-surgery script and apply it**

Save as `/tmp/add-cost-panels.mjs` and run it — it clones existing panels so the pricing `CASE` and config boilerplate are reused verbatim:

```js
import { readFileSync, writeFileSync } from "node:fs";
const P = "docs/assets/dashboards/neurolink-proxy-observability-dashboard.json";
const j = JSON.parse(readFileSync(P, "utf8"));
const cb = j.v5.tabs.find((t) => t.name === "Cost & Budget");
const clone = (o) => JSON.parse(JSON.stringify(o));
const get = (id) => cb.panels.find((p) => p.id === id);
const bar = get("Panel_cost_04"); // bar template w/ pricing CASE

// 1) Flip Cost Trend (Panel_cost_06) line -> stacked area
get("Panel_cost_06").type = "area-stacked";

// 2) Quota panels (bar): latest proxy_ratelimit_after_* per account, as a percentage
const quotaQuery = (col) =>
  `SELECT proxy_account AS x_axis_1, ` +
  `CAST(ROUND(MAX(util) * 100, 1) AS DECIMAL(5,1)) AS y_axis_1 FROM (` +
  `SELECT proxy_account, CAST(${col} AS DOUBLE) AS util, ROW_NUMBER() OVER (` +
  `PARTITION BY proxy_account ORDER BY _timestamp DESC) AS rn ` +
  `FROM neurolink_proxy WHERE operation_name = 'proxy.request' AND ${col} IS NOT NULL ` +
  `AND proxy_account IS NOT NULL AND proxy_account != '') t WHERE rn = 1 ` +
  `GROUP BY proxy_account ORDER BY y_axis_1 DESC`;

const mkQuota = (id, i, x, col, title) => {
  const p = clone(bar);
  p.id = id;
  p.type = "bar";
  p.title = title;
  p.description =
    "Latest rate-limit utilisation per account (%). Anthropic OAuth only.";
  p.layout = { x, y: 34, w: 24, h: 9, i };
  p.queries[0].query = quotaQuery(col);
  p.queries[0].customQuery = true;
  p.queries[0].fields.stream_type = "traces";
  p.queries[0].fields.x = [
    {
      label: "Account",
      alias: "x_axis_1",
      column: "x_axis_1",
      color: null,
      sortBy: "DESC",
    },
  ];
  p.queries[0].fields.y = [
    {
      label: "Utilisation %",
      alias: "y_axis_1",
      column: "y_axis_1",
      color: null,
      aggregationFunction: null,
    },
  ];
  p.queries[0].fields.breakdown = [];
  return p;
};
const p09 = mkQuota(
  "Panel_cost_09",
  9009,
  0,
  "proxy_ratelimit_after_7d",
  "7-day Quota Utilization by Account (%)",
);
const p10 = mkQuota(
  "Panel_cost_10",
  9010,
  24,
  "proxy_ratelimit_after_5h",
  "5-hour Quota Utilization by Account (%)",
);

// 3) Top Sessions by Cost (table): trace-backed proxy-computed cost, grouped by session_id
const p11 = clone(bar);
p11.id = "Panel_cost_11";
p11.type = "table";
p11.title = "Top Sessions by Cost (est., USD)";
p11.description =
  "Top 20 sessions by estimated USD cost (proxy-computed ai_cost_total, from trace spans).";
p11.layout = { x: 0, y: 43, w: 48, h: 10, i: 9011 };
p11.queries[0].fields.stream_type = "traces";
p11.queries[0].query =
  `SELECT session_id AS x_axis_1, ` +
  `CAST(ROUND(SUM(CAST(ai_cost_total AS DOUBLE)), 4) AS DECIMAL(18,4)) AS y_axis_1 FROM neurolink_proxy ` +
  `WHERE operation_name = 'proxy.request' AND session_id IS NOT NULL AND session_id != '' AND ai_cost_total IS NOT NULL ` +
  `GROUP BY session_id ORDER BY y_axis_1 DESC LIMIT 20`;
p11.queries[0].customQuery = true;
p11.queries[0].fields.x = [
  {
    label: "Session",
    alias: "x_axis_1",
    column: "x_axis_1",
    color: null,
    sortBy: "DESC",
  },
];
p11.queries[0].fields.y = [
  {
    label: "Cost (USD)",
    alias: "y_axis_1",
    column: "y_axis_1",
    color: null,
    aggregationFunction: null,
  },
];
p11.queries[0].fields.breakdown = [];

cb.panels.push(p09, p10, p11);
writeFileSync(P, JSON.stringify(j, null, 2) + "\n");
console.log("added Panel_cost_09/10/11; Panel_cost_06 -> area-stacked");
```

Run: `node /tmp/add-cost-panels.mjs`
Expected: `added Panel_cost_09/10/11; Panel_cost_06 -> area-stacked`

- [ ] **Step 4: Run validation + prettier to confirm the edit is well-formed**

Run: `node /tmp/validate-cost-tab.mjs && npx prettier --write docs/assets/dashboards/neurolink-proxy-observability-dashboard.json && npx prettier --check docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`
Expected: `PASS: 11 Cost & Budget panels, area-stacked trend, 49 baseline untouched` then `All matched files use Prettier code style!`

- [ ] **Step 5: Confirm only the dashboard file is modified, then commit through the hook**

Run: `git status --short`
Expected: exactly ` M docs/assets/dashboards/neurolink-proxy-observability-dashboard.json` (plus the untracked `memory-bank/openai-compat-verification/`, which the hook ignores).

```bash
git add docs/assets/dashboards/neurolink-proxy-observability-dashboard.json
git commit -m "docs(observability): complete Cost & Budget tab (quota + top-sessions panels, stacked-area trend)"
```

Expected: pre-commit hook prints `All pre-commit checks passed!` and `COMMIT VALIDATION PASSED!`.

---

### Task 2: Validate the new panels against live OpenObserve data

**Files:**

- Modify (only if a panel's SQL needs correcting): `docs/assets/dashboards/neurolink-proxy-observability-dashboard.json`

**Interfaces:**

- Consumes: panels from Task 1; scripts `scripts/observability/import-openobserve-dashboard.mjs`, `scripts/observability/check-proxy-telemetry.mjs`, and the `neurolink proxy telemetry` CLI.
- Produces: a dashboard whose 11 Cost & Budget panels + 9 Trace panels all render with real data; the 3 new-idiom panels (quota ×2, table) confirmed or corrected.

- [ ] **Step 1: Bring up the stack**

Run: `podman machine start || true` then `pnpm run build:cli && node dist/cli/index.js proxy telemetry setup`
(Equivalent: `bash scripts/observability/manage-local-openobserve.sh setup`.)
Expected: OpenObserve reachable at `http://localhost:5080`; the setup step imports the current dashboard.

- [ ] **Step 2: Generate proxy traffic (must include Anthropic OAuth requests)**

Route several requests through the proxy so `neurolink_proxy` spans and `proxy_*` metrics populate. The quota panels need `proxy_ratelimit_after_5h/_7d`, which **only Anthropic OAuth responses carry** — so at least a few requests must hit an Anthropic OAuth account.
Expected: traffic returns 200s; a few seconds later data is queryable.

- [ ] **Step 3: Confirm streams + the quota columns exist**

Run: `node scripts/observability/check-proxy-telemetry.mjs`
Expected: `neurolink_proxy` stream present, non-zero `doc_num`, recent `latest` age.
Then confirm the exact column names in the OpenObserve UI (`http://localhost:5080`, `<local-user>` / `<local-password>`) by running in the `neurolink_proxy` stream:
`SELECT proxy_account, proxy_ratelimit_after_7d, proxy_ratelimit_after_5h, session_id FROM neurolink_proxy WHERE proxy_ratelimit_after_7d IS NOT NULL LIMIT 5`
Expected: rows returned. If a column name differs (e.g. dotted → different underscore form) or `ROW_NUMBER() OVER` errors, note the correction for Step 4.

- [ ] **Step 4: Re-import and eyeball each panel; correct SQL if needed**

Run: `node scripts/observability/import-openobserve-dashboard.mjs --replace-by-title`
Then open the "Cost & Budget" and "Trace Drilldown" tabs and verify each panel renders non-empty. Focus on the three new idioms:

- **Quota bars (09/10):** `ROW_NUMBER() OVER (... ORDER BY _timestamp DESC)` with `WHERE rn = 1` is confirmed supported in this OpenObserve build (live-validated), so the latest-row query is used as-is — `MAX(util)` then aggregates over the single `rn = 1` row per account, i.e. the latest reading. Do **not** fall back to a bare `MAX(<col>)` over the whole window: that returns the window **peak**, not the latest value, and overstates utilisation.
- **Top Sessions (11):** confirm the table renders two columns (session, cost). If OpenObserve needs the value column in `fields.y` with `aggregationFunction: "sum"` for tables, set it and re-import.
- **Cost Trend (06):** confirm it renders as a stacked area (not line). If the type string differs in this OpenObserve build, use the value the UI exports for a stacked-area panel.

Repeat import → eyeball until all render. Expected end state: every Cost & Budget and Trace panel shows real data; quota panels show per-account % matching `node dist/cli/index.js proxy status` (or `/status`).

- [ ] **Step 5: Commit any live-validation SQL corrections**

Only if Step 4 changed the JSON:
Run: `git status --short` (expect only the dashboard modified), then:

```bash
npx prettier --write docs/assets/dashboards/neurolink-proxy-observability-dashboard.json
git add docs/assets/dashboards/neurolink-proxy-observability-dashboard.json
git commit -m "fix(observability): finalize Cost & Budget panel SQL against live OpenObserve"
```

Expected: hook passes. If Step 4 required no changes, skip — the panels were correct as authored.

---

## Self-Review

**Spec coverage:**

- Add 3 panels (7d quota, 5h quota, Top Sessions) → Task 1 Step 3. ✓
- Cost Trend line → stacked area → Task 1 Step 3 (`Panel_cost_06.type = "area-stacked"`). ✓
- `(est., USD)` labels / inline pricing `CASE` → Task 1 reuses `Panel_cost_04`'s query; Top Sessions title keeps `(est., USD)`. ✓
- Bring up stack, generate traffic, validate `proxy_ratelimit_after_*`, re-import, verify render → Task 2 Steps 1–4. ✓
- Baseline 49 panels unaffected → validation asserts `base === 49`. ✓
- No push/PR without OK → not in plan; deferred to a later explicit step. ✓

**Placeholder scan:** Queries are concrete; the quota latest-row query is spelled out, not "TBD". Live-validation gates are real verification steps, not deferred implementation. ✓

**Type consistency:** ids `Panel_cost_09/10/11` and layout `i` `9009/10/11` used consistently; `area-stacked` used in both the script and the validation check. ✓

**Note on new idioms:** `table` and `area-stacked` have no existing example in this dashboard and `ROW_NUMBER() OVER` is unverified in this OpenObserve build — these are exactly the items Task 2 Step 4 confirms/corrects live, per the spec's "validate new idioms first."
