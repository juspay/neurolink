[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Defined in: [types/proxy.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1378)

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1379)

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1380)

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

Defined in: [types/proxy.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1381)

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1382)
