[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageWindow

# Type Alias: AnthropicUsageWindow

> **AnthropicUsageWindow** = `object`

Defined in: [types/proxy.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1374)

One utilization window from the OAuth usage endpoint (wire shape, loose).

## Properties

### utilization?

> `optional` **utilization?**: `number` \| `null`

Defined in: [types/proxy.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1376)

0-100 percent (note: NOT the 0-1 fraction used by headers).

---

### resets_at?

> `optional` **resets_at?**: `string` \| `null`

Defined in: [types/proxy.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1378)

ISO-8601 timestamp.
