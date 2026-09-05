[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Defined in: [types/proxy.ts:1398](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1398)

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1399](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1399)

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1400](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1400)

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

Defined in: [types/proxy.ts:1401](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1401)

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1402)
