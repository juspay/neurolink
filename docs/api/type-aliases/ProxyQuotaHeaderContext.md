[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1864)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1865)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1866)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1868)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1869)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1872)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1874)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1876)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1877)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1878)
