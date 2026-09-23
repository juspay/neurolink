[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1826)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1827)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1829)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1830)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1832)

Process-local refresh activity; contains no credentials or response body.
