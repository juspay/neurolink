[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheConfig

# Type Alias: ImageCacheConfig

> **ImageCacheConfig** = `object`

Defined in: [types/utilities.ts:254](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L254)

Configuration options for the image cache

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/utilities.ts:256](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L256)

Maximum number of entries in the cache (default: 100)

---

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [types/utilities.ts:258](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L258)

Time-to-live in milliseconds (default: 30 minutes)

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/utilities.ts:260](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/utilities.ts#L260)

Maximum size per image in bytes (default: 10MB)
