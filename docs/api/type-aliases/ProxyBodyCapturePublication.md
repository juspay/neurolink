[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCapturePublication

# Type Alias: ProxyBodyCapturePublication

> **ProxyBodyCapturePublication** = `object`

Defined in: [types/proxy.ts:882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L882)

## Properties

### delivery?

> `optional` **delivery?**: [`ProxyBodyDeliveryResult`](ProxyBodyDeliveryResult.md) \| \{ `status`: `"reference"`; `reason`: `"identical_redacted_payload"`; \} \| \{ `status`: `"policy_excluded"`; `reason`: `"body_byte_budget_exhausted"` \| `"body_byte_budget_invalid"`; \}

Defined in: [types/proxy.ts:883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L883)

---

### reference?

> `optional` **reference?**: [`ProxyBodyCaptureReference`](ProxyBodyCaptureReference.md)

Defined in: [types/proxy.ts:890](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L890)
