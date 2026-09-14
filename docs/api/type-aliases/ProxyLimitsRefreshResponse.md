[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1670)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1673)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1674)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1676)

Process-local refresh activity; contains no credentials or response body.
