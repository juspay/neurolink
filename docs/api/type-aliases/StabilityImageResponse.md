[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StabilityImageResponse

# Type Alias: StabilityImageResponse

> **StabilityImageResponse** = `object`

Stability AI /v2beta/stable-image/generate/{model} response shape
(returns either binary directly, or JSON with base64 when Accept is set
to application/json). We always request JSON for uniformity.

## Properties

### image?

> `optional` **image?**: `string`

---

### finish_reason?

> `optional` **finish_reason?**: `"SUCCESS"` \| `"ERROR"` \| `"CONTENT_FILTERED"`

---

### seed?

> `optional` **seed?**: `number`
