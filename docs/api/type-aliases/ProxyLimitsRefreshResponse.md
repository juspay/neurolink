[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1483)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1484)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1486)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1487)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1489)

Process-local refresh activity; contains no credentials or response body.
