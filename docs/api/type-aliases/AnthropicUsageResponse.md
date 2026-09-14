[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Defined in: [types/proxy.ts:1585](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1585)

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1586)

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1587](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1587)

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

Defined in: [types/proxy.ts:1588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1588)

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1589](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1589)
