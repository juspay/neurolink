[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicResponseMetadata

# Type Alias: AnthropicResponseMetadata

> **AnthropicResponseMetadata** = `object`

Response metadata including rate limit information

## Description

Contains metadata from Anthropic API responses

## Properties

### rateLimit?

> `optional` **rateLimit?**: [`AnthropicRateLimitInfo`](AnthropicRateLimitInfo.md)

Rate limit information from response headers

---

### requestId?

> `optional` **requestId?**: `string`

Request ID for debugging

---

### serverTiming?

> `optional` **serverTiming?**: `string`

Server timing information
