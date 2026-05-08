[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheConfig

# Type Alias: ImageCacheConfig

> **ImageCacheConfig** = `object`

Defined in: [types/utilities.ts:254](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L254)

Configuration options for the image cache

## Properties

### maxSize?

> `optional` **maxSize?**: `number`

Defined in: [types/utilities.ts:256](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L256)

Maximum number of entries in the cache (default: 100)

---

### ttlMs?

> `optional` **ttlMs?**: `number`

Defined in: [types/utilities.ts:258](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L258)

Time-to-live in milliseconds (default: 30 minutes)

---

### maxImageSize?

> `optional` **maxImageSize?**: `number`

Defined in: [types/utilities.ts:260](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L260)

Maximum size per image in bytes (default: 10MB)
