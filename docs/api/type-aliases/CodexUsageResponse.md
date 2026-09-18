[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexUsageResponse

# Type Alias: CodexUsageResponse

> **CodexUsageResponse** = `object`

Defined in: [types/codex.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L85)

Loose shape of the Codex usage endpoint response.

## Properties

### rate_limits?

> `optional` **rate_limits?**: [`CodexRateLimits`](CodexRateLimits.md) \| `null`

Defined in: [types/codex.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L87)

Legacy Codex usage payload.

---

### rate_limit?

> `optional` **rate_limit?**: \{ `allowed?`: `boolean`; `limit_reached?`: `boolean`; `primary_window?`: [`CodexRateLimitWindow`](CodexRateLimitWindow.md) \| `null`; `secondary_window?`: [`CodexRateLimitWindow`](CodexRateLimitWindow.md) \| `null`; \} \| `null`

Defined in: [types/codex.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L89)

Current ChatGPT WHAM account-usage payload.

---

### plan_type?

> `optional` **plan_type?**: `string` \| `null`

Defined in: [types/codex.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L95)
