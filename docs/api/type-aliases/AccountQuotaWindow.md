[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1335)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1337](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1337)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1339](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1339)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1341)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1343)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1345](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1345)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1347)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1348)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1350)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1354)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1356)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1361)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1363](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1363)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1365)

Raw unified header token for header-derived windows, e.g. "7d_oi".
