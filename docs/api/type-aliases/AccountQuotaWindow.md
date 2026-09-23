[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1683)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1685)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1687)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1689](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1689)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1691](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1691)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1693)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1695)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1696)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1698)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1702)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1704](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1704)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1709](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1709)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1711](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1711)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1713](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1713)

Raw unified header token for header-derived windows, e.g. "7d_oi".
