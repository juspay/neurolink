[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestAttemptLogEntry

# Type Alias: RequestAttemptLogEntry

> **RequestAttemptLogEntry** = `object`

## Properties

### upstreamDispatched?

> `optional` **upstreamDispatched?**: `boolean`

False for a local context/budget refusal before a provider call.

---

### requestedModel?

> `optional` **requestedModel?**: `string`

Client model name retained independently of the dispatched model.

---

### tokenBudget?

> `optional` **tokenBudget?**: [`ProxyTokenBudgetSnapshot`](ProxyTokenBudgetSnapshot.md)

---

### contextPreflight?

> `optional` **contextPreflight?**: [`ProxyContextEvidence`](ProxyContextEvidence.md)

---

### accountingScope?

> `optional` **accountingScope?**: `"client"` \| `"internal"`

---

### usageOwnerRequestId?

> `optional` **usageOwnerRequestId?**: `string`

---

### timestamp

> **timestamp**: `string`

---

### requestId

> **requestId**: `string`

---

### parentRequestId?

> `optional` **parentRequestId?**: `string`

Parent client request for an internal fallback invocation.

---

### reasoningEffort?

> `optional` **reasoningEffort?**: `string`

Requested effort retained independently of full body captures.

---

### attempt

> **attempt**: `number`

---

### method

> **method**: `string`

---

### path

> **path**: `string`

---

### model

> **model**: `string`

---

### stream

> **stream**: `boolean`

---

### toolCount

> **toolCount**: `number`

---

### account

> **account**: `string`

---

### accountKey?

> `optional` **accountKey?**: `string`

Provider-qualified account key for collision-free reconstruction.

---

### accountType

> **accountType**: `string`

---

### responseStatus

> **responseStatus**: `number`

---

### responseTimeMs

> **responseTimeMs**: `number`

End-to-end request age when this attempt completed.

---

### attemptDurationMs?

> `optional` **attemptDurationMs?**: `number`

Time spent in this specific account attempt.

---

### errorType?

> `optional` **errorType?**: `string`

---

### errorMessage?

> `optional` **errorMessage?**: `string`

---

### errorCode?

> `optional` **errorCode?**: `string`

Low-level transport code such as ETIMEDOUT or EADDRNOTAVAIL.

---

### transportScope?

> `optional` **transportScope?**: [`ProxyTransportScope`](ProxyTransportScope.md)

Whether changing credentials can affect this transport failure.

---

### retryable?

> `optional` **retryable?**: `boolean`

Whether this failed attempt may be retried without changing the request.

---

### connectPhase?

> `optional` **connectPhase?**: `boolean`

The transport failure happened before any request byte was sent.

---

### rateLimitKind?

> `optional` **rateLimitKind?**: `"transient"` \| `"quota"`

Distinguishes short-lived admission throttles from exhausted quota windows.

---

### cooldownReason?

> `optional` **cooldownReason?**: `"transient"` \| `"session"` \| `"weekly"` \| `"unified"`

Reset-aware cooldown reason selected for a rate-limited attempt.

---

### quotaResetAt?

> `optional` **quotaResetAt?**: `number`

Reset reported by a structured quota rejection, epoch milliseconds.

---

### quotaScope?

> `optional` **quotaScope?**: `"session"` \| `"weekly"` \| `"unknown"`

Unknown scope never implies an account-wide long-window rejection.

---

### inputIncludesCachedTokens?

> `optional` **inputIncludesCachedTokens?**: `boolean`

True when input includes the cache breakdown (native Codex wire usage).

---

### inputTokens?

> `optional` **inputTokens?**: `number`

---

### outputTokens?

> `optional` **outputTokens?**: `number`

---

### cacheCreationTokens?

> `optional` **cacheCreationTokens?**: `number`

---

### cacheReadTokens?

> `optional` **cacheReadTokens?**: `number`

---

### reasoningTokens?

> `optional` **reasoningTokens?**: `number`

Reasoning tokens are a subset of output, never additional usage.

---

### provider?

> `optional` **provider?**: `string`

Provider that received this upstream attempt.

---

### traceId?

> `optional` **traceId?**: `string`

OTel trace ID for correlation with distributed traces

---

### spanId?

> `optional` **spanId?**: `string`

OTel span ID for correlation with distributed traces

---

### traceFlags?

> `optional` **traceFlags?**: `number`

Original OTel sampling flags retained through deferred logging.
