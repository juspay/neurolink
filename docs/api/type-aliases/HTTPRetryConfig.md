[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRetryConfig

# Type Alias: HTTPRetryConfig

> **HTTPRetryConfig** = `object`

Defined in: [types/mcp.ts:945](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L945)

HTTP retry configuration for MCP transport

## Properties

### maxAttempts

> **maxAttempts**: `number`

Defined in: [types/mcp.ts:947](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L947)

Maximum retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Defined in: [types/mcp.ts:949](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L949)

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Defined in: [types/mcp.ts:951](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L951)

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/mcp.ts:953](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L953)

Backoff multiplier (default: 2)

---

### retryableStatusCodes

> **retryableStatusCodes**: `number`[]

Defined in: [types/mcp.ts:955](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L955)

HTTP status codes that trigger retry
