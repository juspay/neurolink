[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StabilityImageResponse

# Type Alias: StabilityImageResponse

> **StabilityImageResponse** = `object`

Defined in: [types/providers.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L280)

Stability AI /v2beta/stable-image/generate/{model} response shape
(returns either binary directly, or JSON with base64 when Accept is set
to application/json). We always request JSON for uniformity.

## Properties

### image?

> `optional` **image?**: `string`

Defined in: [types/providers.ts:281](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L281)

---

### finish_reason?

> `optional` **finish_reason?**: `"SUCCESS"` \| `"ERROR"` \| `"CONTENT_FILTERED"`

Defined in: [types/providers.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L282)

---

### seed?

> `optional` **seed?**: `number`

Defined in: [types/providers.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L283)
