[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageLoaderOptions

# Type Alias: ImageLoaderOptions

> **ImageLoaderOptions** = `object`

Defined in: [types/rag.ts:1795](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1795)

Options for loading images

## Properties

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/rag.ts:1797](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1797)

Custom metadata to attach to the image document

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/rag.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1799)

Maximum image file size in bytes (default: 10MB)

---

### fetchTimeout?

> `optional` **fetchTimeout?**: `number`

Defined in: [types/rag.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1801)

Timeout for URL fetches in milliseconds (default: 30000)

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string`\>

Defined in: [types/rag.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1803)

Custom headers for URL fetches
