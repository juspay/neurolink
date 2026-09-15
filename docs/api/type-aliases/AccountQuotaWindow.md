[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaWindow

# Type Alias: AccountQuotaWindow

> **AccountQuotaWindow** = `object`

Defined in: [types/proxy.ts:1534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1534)

One dynamic limit bucket from the usage API. Provider vocabulary (`kind`,
`group`, `severity`) is preserved verbatim so buckets Anthropic adds later
survive storage and display without a code change.

## Properties

### kind

> **kind**: `string`

Defined in: [types/proxy.ts:1536](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1536)

Provider kind, verbatim ("session", "weekly_all", "weekly_scoped", ...).

---

### group?

> `optional` **group?**: `string`

Defined in: [types/proxy.ts:1538](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1538)

Provider group, verbatim ("session" | "weekly" | future values).

---

### used

> **used**: `number`

Defined in: [types/proxy.ts:1540](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1540)

0.0-1.0 utilization (provider percent / 100).

---

### severity?

> `optional` **severity?**: `string`

Defined in: [types/proxy.ts:1542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1542)

Provider severity, verbatim ("normal", ...).

---

### status

> **status**: `string`

Defined in: [types/proxy.ts:1544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1544)

Derived "allowed" | "rejected" (see usageToQuota status mapping).

---

### resetsAt

> **resetsAt**: `number`

Defined in: [types/proxy.ts:1546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1546)

Unix timestamp (seconds) when this window resets; 0 when unparseable.

---

### isActive?

> `optional` **isActive?**: `boolean`

Defined in: [types/proxy.ts:1547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1547)

---

### scopeModel?

> `optional` **scopeModel?**: `string`

Defined in: [types/proxy.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1549)

Model display name for model-scoped windows (e.g. "Fable").

---

### scopeModelId?

> `optional` **scopeModelId?**: `string`

Defined in: [types/proxy.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1553)

Wire model id for the scope when the provider reports one
(`scope.model.id`), which matches a request's `model` exactly and so beats
display-name matching. Often null in practice.

---

### scopeSurface?

> `optional` **scopeSurface?**: `string`

Defined in: [types/proxy.ts:1555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1555)

Surface scope when the provider reports one.

---

### updatedAt?

> `optional` **updatedAt?**: `number`

Defined in: [types/proxy.ts:1560](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1560)

Epoch ms this individual window was observed. Lets a header-derived window
and a usage-API window on the same account age independently — the flat
`lastUpdated` refreshes on every response and would otherwise make a
days-old scoped window look current.

---

### source?

> `optional` **source?**: [`AccountQuotaSource`](AccountQuotaSource.md)

Defined in: [types/proxy.ts:1562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1562)

Provenance of this window, mirroring AccountQuotaSource.

---

### headerWindow?

> `optional` **headerWindow?**: `string`

Defined in: [types/proxy.ts:1564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1564)

Raw unified header token for header-derived windows, e.g. "7d_oi".
