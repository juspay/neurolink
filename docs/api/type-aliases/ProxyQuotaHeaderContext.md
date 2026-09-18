[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1732](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1732)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1733](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1733)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1734](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1734)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1736)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1737](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1737)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1740)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1742)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1744)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1745)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1746)
