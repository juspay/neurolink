[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1472)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1473)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1475)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1476)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1478)

Process-local refresh activity; contains no credentials or response body.
