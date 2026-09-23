[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyBodyCapturePublication

# Type Alias: ProxyBodyCapturePublication

> **ProxyBodyCapturePublication** = `object`

Defined in: [types/proxy.ts:902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L902)

## Properties

### delivery?

> `optional` **delivery?**: [`ProxyBodyDeliveryResult`](ProxyBodyDeliveryResult.md) \| \{ `status`: `"reference"`; `reason`: `"identical_redacted_payload"`; \} \| \{ `status`: `"policy_excluded"`; `reason`: `"body_byte_budget_exhausted"` \| `"body_byte_budget_invalid"`; \}

Defined in: [types/proxy.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L903)

---

### reference?

> `optional` **reference?**: [`ProxyBodyCaptureReference`](ProxyBodyCaptureReference.md)

Defined in: [types/proxy.ts:910](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L910)
