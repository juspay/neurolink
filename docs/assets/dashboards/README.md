# Proxy dashboard accounting

Import `neurolink-proxy-observability-dashboard.json` into OpenObserve after
the matching proxy release emits the indexed accounting and pricing fields.
The template is an artifact; changing it does not update an installed dashboard
or activate a proxy release. Request panels query the metadata log stream.
Bulk body captures can use a separate stream.

Client traffic, errors, and latency belong to the outer request. An internal
bridge request owns provider usage when `proxy_usage_owner_request_id` names
that child; the parent contributes no second token charge. Cached input is
included once according to `ai_input_includes_cached_tokens`.

Log queries first collapse exact producer retries, ignoring ingestion-time
changes. The stable identity combines service instance and producer event ID;
older records fall back to request ID where available. Contradictory payloads
under one identity are excluded from aggregate totals. The Traffic & Health
conflict counter reports those exclusions. A nonzero counter means totals
cover only the verified subset; use telemetry doctor for the conflicting raw
payloads. Rows without any stable identity cannot establish retry deduplication.

Cost panels sum `ai_cost_api_equivalent_usd` only when
`ai_pricing_status='exact'`. These are estimates from this release's API price
table and complete provider usage, **not subscription charges or quota usage**.
Prefix-inferred prices, missing rates, partial token usage, and a bridge parent's
delegated usage do not receive an invented dollar amount. Pricing-gap panels
show the excluded usage owners; a blank known-cost total is not zero spending.
Cache savings compare cache reads with the same table's uncached input rate.
The offline analyzer's historical estimates separately retain their existing
`requestsPricedByPrefix` and `modelsPricedByPrefix` disclosures.

The deterministic capture-pipeline suite executes the shipped request, token,
cost, and conflict SQL on an in-memory database and records exact price-table,
partial-usage, and unknown-model OTLP fixtures. SQLite validates the standard SQL
logic; verify field availability and query compatibility in the target
OpenObserve version when installing the dashboard. Metric panels retain their
scrape/window semantics and are not a substitute for reconciled request logs.
