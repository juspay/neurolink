[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StabilityImageResponse

# Type Alias: StabilityImageResponse

> **StabilityImageResponse** = `object`

Defined in: [types/providers.ts:337](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L337)

Stability AI /v2beta/stable-image/generate/{model} response shape
(returns either binary directly, or JSON with base64 when Accept is set
to application/json). We always request JSON for uniformity.

## Properties

### image?

> `optional` **image?**: `string`

Defined in: [types/providers.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L338)

---

### finish_reason?

> `optional` **finish_reason?**: `"SUCCESS"` \| `"ERROR"` \| `"CONTENT_FILTERED"`

Defined in: [types/providers.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L339)

---

### seed?

> `optional` **seed?**: `number`

Defined in: [types/providers.ts:340](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L340)
