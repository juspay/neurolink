[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1463)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1464)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1466)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1467)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1469)

Process-local refresh activity; contains no credentials or response body.
