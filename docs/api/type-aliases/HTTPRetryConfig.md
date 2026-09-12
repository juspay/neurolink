[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRetryConfig

# Type Alias: HTTPRetryConfig

> **HTTPRetryConfig** = `object`

Defined in: [types/mcp.ts:983](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L983)

HTTP retry configuration for MCP transport

## Properties

### maxAttempts

> **maxAttempts**: `number`

Defined in: [types/mcp.ts:985](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L985)

Maximum retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Defined in: [types/mcp.ts:987](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L987)

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Defined in: [types/mcp.ts:989](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L989)

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/mcp.ts:991](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L991)

Backoff multiplier (default: 2)

---

### retryableStatusCodes

> **retryableStatusCodes**: `number`[]

Defined in: [types/mcp.ts:993](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L993)

HTTP status codes that trigger retry
