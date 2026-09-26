[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageWindow

# Type Alias: AnthropicUsageWindow

> **AnthropicUsageWindow** = `object`

Defined in: [types/proxy.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1829)

One utilization window from the OAuth usage endpoint (wire shape, loose).

## Properties

### utilization?

> `optional` **utilization?**: `number` \| `null`

Defined in: [types/proxy.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1831)

0-100 percent (note: NOT the 0-1 fraction used by headers).

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

Defined in: [types/proxy.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1833)

ISO-8601 timestamp.
