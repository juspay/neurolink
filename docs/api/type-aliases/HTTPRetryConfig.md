[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTTPRetryConfig

# Type Alias: HTTPRetryConfig

> **HTTPRetryConfig** = `object`

HTTP retry configuration for MCP transport

## Properties

### maxAttempts

> **maxAttempts**: `number`

Maximum retry attempts (default: 3)

---

### initialDelay

> **initialDelay**: `number`

Initial delay in ms (default: 1000)

---

### maxDelay

> **maxDelay**: `number`

Maximum delay in ms (default: 30000)

---

### backoffMultiplier

> **backoffMultiplier**: `number`

Backoff multiplier (default: 2)

---

### retryableStatusCodes

> **retryableStatusCodes**: `number`[]

HTTP status codes that trigger retry
