[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1916)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1917)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1919)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1920)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1922](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1922)

Process-local refresh activity; contains no credentials or response body.
