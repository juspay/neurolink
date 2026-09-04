[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1478)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1479)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1481)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1482](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1482)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1484)

Process-local refresh activity; contains no credentials or response body.
