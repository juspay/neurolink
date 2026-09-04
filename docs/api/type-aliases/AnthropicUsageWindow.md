[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageWindow

# Type Alias: AnthropicUsageWindow

> **AnthropicUsageWindow** = `object`

Defined in: [types/proxy.ts:1369](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1369)

One utilization window from the OAuth usage endpoint (wire shape, loose).

## Properties

### utilization?

> `optional` **utilization?**: `number` \| `null`

Defined in: [types/proxy.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1371)

0-100 percent (note: NOT the 0-1 fraction used by headers).

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

Defined in: [types/proxy.ts:1373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1373)

ISO-8601 timestamp.
