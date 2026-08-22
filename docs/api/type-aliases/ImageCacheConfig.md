[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheConfig

# Type Alias: ImageCacheConfig

> **ImageCacheConfig** = `object`

Defined in: [types/utilities.ts:254](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L254)

Configuration options for the image cache

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/utilities.ts:256](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L256)

Maximum number of entries in the cache (default: 100)

---

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [types/utilities.ts:258](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L258)

Time-to-live in milliseconds (default: 30 minutes)

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/utilities.ts:260](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/utilities.ts#L260)

Maximum size per image in bytes (default: 10MB)
