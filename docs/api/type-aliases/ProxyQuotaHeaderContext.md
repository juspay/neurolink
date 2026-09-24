[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1966)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1967)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1968)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1970)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1971](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1971)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1974)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1976)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1978)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1979)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1980)
