[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicUsageResponse

# Type Alias: AnthropicUsageResponse

> **AnthropicUsageResponse** = `object`

Response body of GET https://api.anthropic.com/api/oauth/usage (loose —
unknown keys are ignored, known keys may be absent or null).

## Properties

### five_hour?

> `optional` **five_hour?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

---

### seven_day?

> `optional` **seven_day?**: [`AnthropicUsageWindow`](AnthropicUsageWindow.md) \| `null`

---

### limits?

> `optional` **limits?**: [`AnthropicUsageLimit`](AnthropicUsageLimit.md)[] \| `null`

---

### extra_usage?

> `optional` **extra_usage?**: \{ `is_enabled?`: `boolean` \| `null`; \} \| `null`
