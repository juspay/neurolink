[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1253)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1255)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1257)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1259)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1261)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1263)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1265)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1266)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1268)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1272)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1274)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1279)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1281)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1283](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1283)

Raw unified header token for header-derived windows, e.g. "7d_oi".
