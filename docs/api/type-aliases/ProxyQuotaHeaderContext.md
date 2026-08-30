[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1479)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1480)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1481)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1483)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1484](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1484)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1487)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1489)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1491)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1492)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1493)
