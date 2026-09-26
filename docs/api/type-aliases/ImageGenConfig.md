[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageGenConfig

# Type Alias: ImageGenConfig

> **ImageGenConfig** = `object`

Configuration for the ImageGenService

## Properties

### enabled

> **enabled**: `boolean`

Whether image generation is enabled

---

### defaultModel

> **defaultModel**: `string`

Default model to use for generation

---

### defaultProvider

> **defaultProvider**: [`ImageGenProvider`](ImageGenProvider.md) \| `string`

Default provider for image generation

---

### defaultRegion?

> `optional` **defaultRegion?**: `string`

Default region for the provider (if applicable)

---

### timeout

> **timeout**: `number`

Timeout for generation requests in milliseconds

---

### defaultTemperature?

> `optional` **defaultTemperature?**: `number`

Default temperature for generation

---

### maxImages?

> `optional` **maxImages?**: `number`

Maximum number of images per request

---

### maxReferenceImages?

> `optional` **maxReferenceImages?**: `number`

Maximum number of reference images allowed

---

### maxReferencePdfs?

> `optional` **maxReferencePdfs?**: `number`

Maximum number of reference PDFs allowed
