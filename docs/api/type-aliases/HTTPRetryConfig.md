[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRetryConfig

# Type Alias: HTTPRetryConfig

> **HTTPRetryConfig** = `object`

Defined in: [types/mcpTypes.ts:950](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L950)

HTTP retry configuration for MCP transport

## Properties

### maxAttempts

> **maxAttempts**: `number`

Defined in: [types/mcpTypes.ts:952](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L952)

Maximum retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Defined in: [types/mcpTypes.ts:954](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L954)

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Defined in: [types/mcpTypes.ts:956](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L956)

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Defined in: [types/mcpTypes.ts:958](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L958)

Backoff multiplier (default: 2)

---

### retryableStatusCodes

> **retryableStatusCodes**: `number`[]

Defined in: [types/mcpTypes.ts:960](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/types/mcpTypes.ts#L960)

HTTP status codes that trigger retry
