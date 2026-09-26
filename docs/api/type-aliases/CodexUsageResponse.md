[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexUsageResponse

# Type Alias: CodexUsageResponse

> **CodexUsageResponse** = `object`

Loose shape of the Codex usage endpoint response.

## Properties

### rate_limits?

> `optional` **rate_limits?**: [`CodexRateLimits`](CodexRateLimits.md) \| `null`

Legacy Codex usage payload.

---

### rate_limit?

> `optional` **rate_limit?**: \{ `allowed?`: `boolean`; `limit_reached?`: `boolean`; `primary_window?`: [`CodexRateLimitWindow`](CodexRateLimitWindow.md) \| `null`; `secondary_window?`: [`CodexRateLimitWindow`](CodexRateLimitWindow.md) \| `null`; \} \| `null`

Current ChatGPT WHAM account-usage payload.

---

### plan_type?

> `optional` **plan_type?**: `string` \| `null`
