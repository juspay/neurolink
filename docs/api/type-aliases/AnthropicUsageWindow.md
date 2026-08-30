[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageWindow

# Type Alias: AnthropicUsageWindow

> **AnthropicUsageWindow** = `object`

Defined in: [types/proxy.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1354)

One utilization window from the OAuth usage endpoint (wire shape, loose).

## Properties

### utilization?

> `optional` **utilization?**: `number` \| `null`

Defined in: [types/proxy.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1356)

0-100 percent (note: NOT the 0-1 fraction used by headers).

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

Defined in: [types/proxy.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1358)

ISO-8601 timestamp.
