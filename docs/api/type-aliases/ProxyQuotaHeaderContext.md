[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1976)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1977)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1978)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1980)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1981](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1981)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1984)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1986](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1986)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1988](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1988)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1989)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1990](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1990)
