[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicResponseMetadata

# Type Alias: AnthropicResponseMetadata

> **AnthropicResponseMetadata** = `object`

Defined in: [types/subscription.ts:220](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L220)

Response metadata including rate limit information

## Description

Contains metadata from Anthropic API responses

## Properties

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L224)

Rate limit information from response headers

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/subscription.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L229)

Request ID for debugging

---

### serverTiming?

> `optional` **serverTiming?**: `string`

Defined in: [types/subscription.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L234)

Server timing information
