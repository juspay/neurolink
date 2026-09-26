[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenResult

# Type Alias: ImageGenResult

> **ImageGenResult** = `object`

Result of an image generation request

## Properties

### success

> **success**: `boolean`

Whether generation was successful

---

### imageBuffer?

> `optional` **imageBuffer?**: `Buffer`

Generated image as Buffer (if successful)

---

### base64?

> `optional` **base64?**: `string`

Generated image as base64 string (if successful)

---

### mimeType?

> `optional` **mimeType?**: `string`

MIME type of the generated image
e.g., "image/png", "image/jpeg"

---

### model?

> `optional` **model?**: `string`

Model used for generation

---

### provider?

> `optional` **provider?**: `string`

Provider used for generation

---

### error?

> `optional` **error?**: `string`

Error message if generation failed

---

### generationTimeMs?

> `optional` **generationTimeMs?**: `number`

Time taken for generation in milliseconds

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Additional metadata from the provider
