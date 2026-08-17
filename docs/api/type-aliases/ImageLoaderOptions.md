[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageLoaderOptions

# Type Alias: ImageLoaderOptions

> **ImageLoaderOptions** = `object`

Defined in: [types/rag.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1776)

Options for loading images

## Properties

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1778](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1778)

Custom metadata to attach to the image document

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/rag.ts:1780](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1780)

Maximum image file size in bytes (default: 10MB)

---

### fetchTimeout?

> `optional` **fetchTimeout?**: `number`

Defined in: [types/rag.ts:1782](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1782)

Timeout for URL fetches in milliseconds (default: 30000)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/rag.ts:1784](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1784)

Custom headers for URL fetches
