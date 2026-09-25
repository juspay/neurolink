[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicRateLimitInfo

# Type Alias: AnthropicRateLimitInfo

> **AnthropicRateLimitInfo** = `object`

Defined in: [types/subscription.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L97)

Rate limit information parsed from Anthropic API response headers

## See

https://docs.anthropic.com/en/api/rate-limits

## Properties

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L101)

Maximum number of requests allowed in the current window

---

### requestsRemaining?

> `optional` **requestsRemaining?**: `number`

Defined in: [types/subscription.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L106)

Number of requests remaining in the current window

---

### requestsReset?

> `optional` **requestsReset?**: `string`

Defined in: [types/subscription.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L111)

Time when the request limit resets (ISO 8601 timestamp)

---

### tokensLimit?

> `optional` **tokensLimit?**: `number`

Defined in: [types/subscription.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L116)

Maximum number of tokens allowed in the current window

---

### tokensRemaining?

> `optional` **tokensRemaining?**: `number`

Defined in: [types/subscription.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L121)

Number of tokens remaining in the current window

---

### tokensReset?

> `optional` **tokensReset?**: `string`

Defined in: [types/subscription.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L126)

Time when the token limit resets (ISO 8601 timestamp)

---

### retryAfter?

> `optional` **retryAfter?**: `number`

Defined in: [types/subscription.ts:131](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L131)

Retry-After header value in seconds (present on 429 responses)

---

### sessionUtilization?

> `optional` **sessionUtilization?**: `number`

Defined in: [types/subscription.ts:141](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L141)

Subscription (OAuth) window utilization, 0.0-1.0 of capacity USED, from
`anthropic-ratelimit-unified-5h-utilization`.

Anthropic publishes utilization for subscription windows, never an
absolute remaining count — there is no message or token figure to report.
`sessionLeftPct` below is the derived "how much is left".

---

### sessionStatus?

> `optional` **sessionStatus?**: `string`

Defined in: [types/subscription.ts:143](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L143)

"allowed" | "throttled" | "rejected" for the 5h window.

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number`

Defined in: [types/subscription.ts:145](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L145)

Unix epoch seconds at which the 5h window resets.

---

### sessionLeftPct?

> `optional` **sessionLeftPct?**: `number`

Defined in: [types/subscription.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L147)

Whole-percent capacity remaining in the 5h window (100 - utilization).

---

### weeklyUtilization?

> `optional` **weeklyUtilization?**: `number`

Defined in: [types/subscription.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L150)

7d window utilization, 0.0-1.0 of capacity USED.

---

### weeklyStatus?

> `optional` **weeklyStatus?**: `string`

Defined in: [types/subscription.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L151)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number`

Defined in: [types/subscription.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L152)

---

### weeklyLeftPct?

> `optional` **weeklyLeftPct?**: `number`

Defined in: [types/subscription.ts:153](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L153)

---

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/subscription.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L157)

Authoritative top-level unified status; can be "rejected" even while both
sub-windows still report "allowed".

---

### overageStatus?

> `optional` **overageStatus?**: `string`

Defined in: [types/subscription.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L159)

Whether overage is permitted once a window is exhausted.
