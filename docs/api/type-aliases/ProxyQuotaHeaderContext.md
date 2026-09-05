[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1521](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1521)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1522)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1523)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1525)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1526)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1529](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1529)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1531)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1533)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1534)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1535)
