[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicNonOkResult

# Type Alias: AnthropicNonOkResult

> **AnthropicNonOkResult** = `object`

## Properties

### response?

> `optional` **response?**: `Response` \| `unknown`

---

### continueLoop

> **continueLoop**: `boolean`

---

### retrySameAccount?

> `optional` **retrySameAccount?**: `boolean`

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

### sawTransientFailure

> **sawTransientFailure**: `boolean`

---

### invalidRequestFailure

> **invalidRequestFailure**: \{ `status`: `number`; `body`: `string`; `contentType?`: `string`; \} \| `null`

---

### entitlementFailure

> **entitlementFailure**: [`AnthropicEntitlementFailure`](AnthropicEntitlementFailure.md) \| `null`

---

### upstreamSpan?

> `optional` **upstreamSpan?**: `Span`
