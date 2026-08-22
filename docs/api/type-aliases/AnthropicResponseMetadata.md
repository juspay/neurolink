[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicResponseMetadata

# Type Alias: AnthropicResponseMetadata

> **AnthropicResponseMetadata** = `object`

Defined in: [types/subscription.ts:219](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L219)

Response metadata including rate limit information

## Description

Contains metadata from Anthropic API responses

## Properties

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:223](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L223)

Rate limit information from response headers

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/subscription.ts:228](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L228)

Request ID for debugging

---

### serverTiming?

> `optional` **serverTiming?**: `string`

Defined in: [types/subscription.ts:233](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/subscription.ts#L233)

Server timing information
