[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1888)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1889)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1891)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1892](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1892)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1895)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1897)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1899)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1900)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1901)
