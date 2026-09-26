[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageLoaderOptions

# Type Alias: ImageLoaderOptions

> **ImageLoaderOptions** = `object`

Options for loading images

## Properties

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Custom metadata to attach to the image document

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Maximum image file size in bytes (default: 10MB)

---

### fetchTimeout?

> `optional` **fetchTimeout?**: `number`

Timeout for URL fetches in milliseconds (default: 30000)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Custom headers for URL fetches
