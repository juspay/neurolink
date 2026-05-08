[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicRateLimitInfo

# Type Alias: AnthropicRateLimitInfo

> **AnthropicRateLimitInfo** = `object`

Defined in: [types/subscription.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L95)

Rate limit information parsed from Anthropic API response headers

## See

https://docs.anthropic.com/en/api/rate-limits

## Properties

### requestsLimit?

> `optional` **requestsLimit?**: `number`

Defined in: [types/subscription.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L99)

Maximum number of requests allowed in the current window

---

### requestsRemaining?

> `optional` **requestsRemaining?**: `number`

Defined in: [types/subscription.ts:104](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L104)

Number of requests remaining in the current window

---

### requestsReset?

> `optional` **requestsReset?**: `string`

Defined in: [types/subscription.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L109)

Time when the request limit resets (ISO 8601 timestamp)

---

### tokensLimit?

> `optional` **tokensLimit?**: `number`

Defined in: [types/subscription.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L114)

Maximum number of tokens allowed in the current window

---

### tokensRemaining?

> `optional` **tokensRemaining?**: `number`

Defined in: [types/subscription.ts:119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L119)

Number of tokens remaining in the current window

---

### tokensReset?

> `optional` **tokensReset?**: `string`

Defined in: [types/subscription.ts:124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L124)

Time when the token limit resets (ISO 8601 timestamp)

---

### retryAfter?

> `optional` **retryAfter?**: `number`

Defined in: [types/subscription.ts:129](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L129)

Retry-After header value in seconds (present on 429 responses)
