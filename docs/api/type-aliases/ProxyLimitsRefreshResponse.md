[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1775](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1775)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1776)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1778)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1779)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1781)

Process-local refresh activity; contains no credentials or response body.
