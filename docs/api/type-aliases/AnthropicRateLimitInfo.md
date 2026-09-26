[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicRateLimitInfo

# Type Alias: AnthropicRateLimitInfo

> **AnthropicRateLimitInfo** = `object`

Rate limit information parsed from Anthropic API response headers

## See

https://docs.anthropic.com/en/api/rate-limits

## Properties

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Maximum number of requests allowed in the current window

---

### requestsRemaining?

> `optional` **requestsRemaining?**: `number`

Number of requests remaining in the current window

---

### requestsReset?

> `optional` **requestsReset?**: `string`

Time when the request limit resets (ISO 8601 timestamp)

---

### tokensLimit?

> `optional` **tokensLimit?**: `number`

Maximum number of tokens allowed in the current window

---

### tokensRemaining?

> `optional` **tokensRemaining?**: `number`

Number of tokens remaining in the current window

---

### tokensReset?

> `optional` **tokensReset?**: `string`

Time when the token limit resets (ISO 8601 timestamp)

---

### retryAfter?

> `optional` **retryAfter?**: `number`

Retry-After header value in seconds (present on 429 responses)

---

### sessionUtilization?

> `optional` **sessionUtilization?**: `number`

Subscription (OAuth) window utilization, 0.0-1.0 of capacity USED, from
`anthropic-ratelimit-unified-5h-utilization`.

Anthropic publishes utilization for subscription windows, never an
absolute remaining count — there is no message or token figure to report.
`sessionLeftPct` below is the derived "how much is left".

---

### sessionStatus?

> `optional` **sessionStatus?**: `string`

"allowed" | "throttled" | "rejected" for the 5h window.

---

### sessionResetAt?

> `optional` **sessionResetAt?**: `number`

Unix epoch seconds at which the 5h window resets.

---

### sessionLeftPct?

> `optional` **sessionLeftPct?**: `number`

Whole-percent capacity remaining in the 5h window (100 - utilization).

---

### weeklyUtilization?

> `optional` **weeklyUtilization?**: `number`

7d window utilization, 0.0-1.0 of capacity USED.

---

### weeklyStatus?

> `optional` **weeklyStatus?**: `string`

---

### weeklyResetAt?

> `optional` **weeklyResetAt?**: `number`

---

### weeklyLeftPct?

> `optional` **weeklyLeftPct?**: `number`

---

### unifiedStatus?

> `optional` **unifiedStatus?**: `string`

Authoritative top-level unified status; can be "rejected" even while both
sub-windows still report "allowed".

---

### overageStatus?

> `optional` **overageStatus?**: `string`

Whether overage is permitted once a window is exhausted.
