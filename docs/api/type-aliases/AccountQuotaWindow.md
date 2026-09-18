[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1551)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1553)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1555)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1557](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1557)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1559)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1561)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1563)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1564)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1566](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1566)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1570)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1572)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1577)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1579](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1579)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1581](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1581)

Raw unified header token for header-derived windows, e.g. "7d_oi".
