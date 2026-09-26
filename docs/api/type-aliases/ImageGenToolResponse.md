[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenToolResponse

# Type Alias: ImageGenToolResponse

> **ImageGenToolResponse** = `object`

Response from the image generation tool

## Properties

### success

> **success**: `boolean`

Whether the tool execution was successful

---

### image?

> `optional` **image?**: `string`

Data URI of the generated image (if successful)
Format: data:image/png;base64,...

---

### message?

> `optional` **message?**: `string`

Human-readable message about the result

---

### error?

> `optional` **error?**: `string`

Error message if execution failed
