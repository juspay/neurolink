[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1340)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1342](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1342)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1344](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1344)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1346](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1346)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1348)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1350)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1352)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1353)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1355](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1355)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1359)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1361)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1366)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1368)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1370](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1370)

Raw unified header token for header-derived windows, e.g. "7d_oi".
