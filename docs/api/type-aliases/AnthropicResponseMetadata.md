[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicResponseMetadata

# Type Alias: AnthropicResponseMetadata

> **AnthropicResponseMetadata** = `object`

Defined in: [types/subscription.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L221)

Response metadata including rate limit information

## Description

Contains metadata from Anthropic API responses

## Properties

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L225)

Rate limit information from response headers

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/subscription.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L230)

Request ID for debugging

---

### serverTiming?

> `optional` **serverTiming?**: `string`

Defined in: [types/subscription.ts:235](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L235)

Server timing information
