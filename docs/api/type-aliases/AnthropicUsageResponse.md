[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Defined in: [types/proxy.ts:1387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1387)

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1388](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1388)

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

Defined in: [types/proxy.ts:1389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1389)

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

Defined in: [types/proxy.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1390)

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`

Defined in: [types/proxy.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1391)
