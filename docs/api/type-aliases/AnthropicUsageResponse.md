[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Defined in: [types/proxy.ts:1829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1829)

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1830)

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1831)

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

Defined in: [types/proxy.ts:1832](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1832)

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1833)
