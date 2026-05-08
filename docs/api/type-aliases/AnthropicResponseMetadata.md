[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicResponseMetadata

# Type Alias: AnthropicResponseMetadata

> **AnthropicResponseMetadata** = `object`

Defined in: [types/subscription.ts:137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L137)

Response metadata including rate limit information

## Description

Contains metadata from Anthropic API responses

## Properties

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Defined in: [types/subscription.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L141)

Rate limit information from response headers

---

### requestId?

> `optional` **requestId?**: `string`

Defined in: [types/subscription.ts:146](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L146)

Request ID for debugging

---

### serverTiming?

> `optional` **serverTiming?**: `string`

Defined in: [types/subscription.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L151)

Server timing information
