[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StabilityImageResponse

# Type Alias: StabilityImageResponse

> **StabilityImageResponse** = `object`

Defined in: [types/providers.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L299)

Stability AI /v2beta/stable-image/generate/{model} response shape
(returns either binary directly, or JSON with base64 when Accept is set
to application/json). We always request JSON for uniformity.

## Properties

### image?

> `optional` **image?**: `string`

Defined in: [types/providers.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L300)

---

### finish_reason?

> `optional` **finish_reason?**: `"SUCCESS"` \| `"ERROR"` \| `"CONTENT_FILTERED"`

Defined in: [types/providers.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L301)

---

### seed?

> `optional` **seed?**: `number`

Defined in: [types/providers.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L302)
