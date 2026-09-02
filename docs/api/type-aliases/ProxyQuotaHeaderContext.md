[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaHeaderContext

# Type Alias: ProxyQuotaHeaderContext

> **ProxyQuotaHeaderContext** = `object`

Defined in: [types/proxy.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1510)

Everything the proxy knows about limits and routing for one response.
Consumed by `buildQuotaResponseHeaders` — kept as data (not headers) so the
assembly stays pure and testable.

## Properties

### quota

> **quota**: [`AccountQuota`](AccountQuota.md) \| `null`

Defined in: [types/proxy.ts:1511](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1511)

---

### source

> **source**: [`ProxyQuotaSource`](ProxyQuotaSource.md)

Defined in: [types/proxy.ts:1512](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1512)

---

### accountLabel?

> `optional` **accountLabel?**: `string`

Defined in: [types/proxy.ts:1514](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1514)

Account label that served the request; omitted for fallback/no-account.

---

### accountType?

> `optional` **accountType?**: `string`

Defined in: [types/proxy.ts:1515](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1515)

---

### servedBy?

> `optional` **servedBy?**: `string`

Defined in: [types/proxy.ts:1518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1518)

Which upstream actually produced the response ("anthropic" or a fallback
provider name). Lets a consumer avoid attributing quota to the wrong one.

---

### attempt?

> `optional` **attempt?**: `number`

Defined in: [types/proxy.ts:1520](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1520)

1-based attempt index within the routing loop.

---

### coolingUntil?

> `optional` **coolingUntil?**: `number`

Defined in: [types/proxy.ts:1522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1522)

Epoch ms until which the serving account is cooling, when applicable.

---

### coolingReason?

> `optional` **coolingReason?**: [`AccountCoolingReason`](AccountCoolingReason.md)

Defined in: [types/proxy.ts:1523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1523)

---

### pool?

> `optional` **pool?**: [`ProxyPoolHeadroom`](ProxyPoolHeadroom.md)

Defined in: [types/proxy.ts:1524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1524)
