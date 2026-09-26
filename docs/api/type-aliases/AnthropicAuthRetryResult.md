[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicAuthRetryResult

# Type Alias: AnthropicAuthRetryResult

> **AnthropicAuthRetryResult** = `object`

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

---

### holdsAccountAdmission?

> `optional` **holdsAccountAdmission?**: `boolean`

---

### continueLoop

> **continueLoop**: `boolean`

---

### retryDelayMs?

> `optional` **retryDelayMs?**: `number`

Failure-path pacing before rotating after provider-wide overload.

---

### lastError

> **lastError**: `unknown`

---

### authFailureMessage

> **authFailureMessage**: `string` \| `null`

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

---

### sawRateLimit

> **sawRateLimit**: `boolean`

---

### sawTransientFailure

> **sawTransientFailure**: `boolean`

---

### sawNetworkError

> **sawNetworkError**: `boolean`

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`
