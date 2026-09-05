[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicRateLimitInfo

# Type Alias: AnthropicRateLimitInfo

> **AnthropicRateLimitInfo** = `object`

Defined in: [types/subscription.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L96)

Rate limit information parsed from Anthropic API response headers

## See

https://docs.anthropic.com/en/api/rate-limits

## Properties

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L100)

Maximum number of requests allowed in the current window

---

### requestsRemaining?

> `optional` **requestsRemaining?**: `number`

Defined in: [types/subscription.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L105)

Number of requests remaining in the current window

---

### requestsReset?

> `optional` **requestsReset?**: `string`

Defined in: [types/subscription.ts:110](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L110)

Time when the request limit resets (ISO 8601 timestamp)

---

### tokensLimit?

> `optional` **tokensLimit?**: `number`

Defined in: [types/subscription.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L115)

Maximum number of tokens allowed in the current window

---

### tokensRemaining?

> `optional` **tokensRemaining?**: `number`

Defined in: [types/subscription.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L120)

Number of tokens remaining in the current window

---

### tokensReset?

> `optional` **tokensReset?**: `string`

Defined in: [types/subscription.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L125)

Time when the token limit resets (ISO 8601 timestamp)

---

### retryAfter?

> `optional` **retryAfter?**: `number`

Defined in: [types/subscription.ts:130](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L130)

Retry-After header value in seconds (present on 429 responses)

---

### sessionUtilization?

> `optional` **sessionUtilization?**: `number`

Defined in: [types/subscription.ts:140](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L140)

Subscription (OAuth) window utilization, 0.0-1.0 of capacity USED, from
`anthropic-ratelimit-unified-5h-utilization`.

Anthropic publishes utilization for subscription windows, never an
absolute remaining count — there is no message or token figure to report.
`sessionLeftPct` below is the derived "how much is left".

---

### sessionStatus?

> `optional` **sessionStatus?**: `string`

Defined in: [types/subscription.ts:142](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L142)

"allowed" | "throttled" | "rejected" for the 5h window.

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number`

Defined in: [types/subscription.ts:144](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L144)

Unix epoch seconds at which the 5h window resets.

---

### sessionLeftPct?

> `optional` **sessionLeftPct?**: `number`

Defined in: [types/subscription.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L146)

Whole-percent capacity remaining in the 5h window (100 - utilization).

---

### weeklyUtilization?

> `optional` **weeklyUtilization?**: `number`

Defined in: [types/subscription.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L149)

7d window utilization, 0.0-1.0 of capacity USED.

---

### weeklyStatus?

> `optional` **weeklyStatus?**: `string`

Defined in: [types/subscription.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L150)

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number`

Defined in: [types/subscription.ts:151](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L151)

---

### weeklyLeftPct?

> `optional` **weeklyLeftPct?**: `number`

Defined in: [types/subscription.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L152)

---

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Defined in: [types/subscription.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L156)

Authoritative top-level unified status; can be "rejected" even while both
sub-windows still report "allowed".

---

### overageStatus?

> `optional` **overageStatus?**: `string`

Defined in: [types/subscription.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L158)

Whether overage is permitted once a window is exhausted.
