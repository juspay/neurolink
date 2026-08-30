[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLimitsRefreshResponse

# Type Alias: ProxyLimitsRefreshResponse

> **ProxyLimitsRefreshResponse** = `object`

Defined in: [types/proxy.ts:1441](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1441)

Response body of the proxy's GET /limits endpoint.

## Properties

### fetchedAt

> **fetchedAt**: `number`

Defined in: [types/proxy.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1442)

---

### snapshot

> **snapshot**: `boolean`

Defined in: [types/proxy.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1444)

True when served from stored state without contacting Anthropic.

---

### results

> **results**: [`ProxyLimitsAccountResult`](ProxyLimitsAccountResult.md)[]

Defined in: [types/proxy.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1445)

---

### refreshMetrics?

> `optional` **refreshMetrics?**: [`ProxyQuotaRefreshMetrics`](ProxyQuotaRefreshMetrics.md)

Defined in: [types/proxy.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1447)

Process-local refresh activity; contains no credentials or response body.
