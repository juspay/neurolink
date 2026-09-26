[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCapturePublication

# Type Alias: ProxyBodyCapturePublication

> **ProxyBodyCapturePublication** = `object`

## Properties

### delivery?

> `optional` **delivery?**: [`ProxyBodyDeliveryResult`](ProxyBodyDeliveryResult.md) \| \{ `status`: `"reference"`; `reason`: `"identical_redacted_payload"`; \} \| \{ `status`: `"policy_excluded"`; `reason`: `"body_byte_budget_exhausted"` \| `"body_byte_budget_invalid"`; \}

---

### reference?

> `optional` **reference?**: [`ProxyBodyCaptureReference`](ProxyBodyCaptureReference.md)
