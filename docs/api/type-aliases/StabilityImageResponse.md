[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StabilityImageResponse

# Type Alias: StabilityImageResponse

> **StabilityImageResponse** = `object`

Defined in: [types/providers.ts:283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L283)

Stability AI /v2beta/stable-image/generate/{model} response shape
(returns either binary directly, or JSON with base64 when Accept is set
to application/json). We always request JSON for uniformity.

## Properties

### image?

> `optional` **image?**: `string`

Defined in: [types/providers.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L284)

---

### finish_reason?

> `optional` **finish_reason?**: `"SUCCESS"` \| `"ERROR"` \| `"CONTENT_FILTERED"`

Defined in: [types/providers.ts:285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L285)

---

### seed?

> `optional` **seed?**: `number`

Defined in: [types/providers.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L286)
