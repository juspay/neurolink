[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRetryConfig

# Type Alias: HTTPRetryConfig

> **HTTPRetryConfig** = `object`

Defined in: [types/mcp.ts:964](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L964)

HTTP retry configuration for MCP transport

## Properties

### maxAttempts

> **maxAttempts**: `number`

Defined in: [types/mcp.ts:966](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L966)

Maximum retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Defined in: [types/mcp.ts:968](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L968)

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Defined in: [types/mcp.ts:970](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L970)

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/mcp.ts:972](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L972)

Backoff multiplier (default: 2)

---

### retryableStatusCodes

> **retryableStatusCodes**: `number`[]

Defined in: [types/mcp.ts:974](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L974)

HTTP status codes that trigger retry
