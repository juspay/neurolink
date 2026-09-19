[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheConfig

# Type Alias: ImageCacheConfig

> **ImageCacheConfig** = `object`

Defined in: [types/utilities.ts:268](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L268)

Configuration options for the image cache

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/utilities.ts:270](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L270)

Maximum number of entries in the cache (default: 100)

---

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [types/utilities.ts:272](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L272)

Time-to-live in milliseconds (default: 30 minutes)

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/utilities.ts:274](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L274)

Maximum size per image in bytes (default: 10MB)
