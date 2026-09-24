[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Defined in: [types/proxy.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1764)

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1765)

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1766)

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

Defined in: [types/proxy.ts:1767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1767)

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1768](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1768)
