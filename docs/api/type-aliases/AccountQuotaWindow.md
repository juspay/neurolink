[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1795](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1795)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1797](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1797)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1799)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1801)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1803)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1805)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1807](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1807)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1808](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1808)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1810](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1810)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1814](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1814)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1816](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1816)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1821)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1823)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1825)

Raw unified header token for header-derived windows, e.g. "7d_oi".
