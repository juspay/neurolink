[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1694)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1695](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1695)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1697](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1697)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1698](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1698)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1700](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1700)

Process-local refresh activity; contains no credentials or response body.
