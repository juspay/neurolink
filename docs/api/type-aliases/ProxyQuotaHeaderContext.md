[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1954)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1955)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1956)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1958)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1959](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1959)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1962)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1964)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1966)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1967)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1968)
