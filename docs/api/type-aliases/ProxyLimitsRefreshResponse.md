[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1846)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1847)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1849)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1850)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1852)

Process-local refresh activity; contains no credentials or response body.
