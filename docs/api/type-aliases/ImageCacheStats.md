[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheStats

# Type Alias: ImageCacheStats

> **ImageCacheStats** = `object`

Defined in: [types/utilities.ts:280](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L280)

Cache statistics for monitoring

## Properties

### hits

> **hits**: `number`

Defined in: [types/utilities.ts:282](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L282)

Number of cache hits

---

### misses

> **misses**: `number`

Defined in: [types/utilities.ts:284](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L284)

Number of cache misses

---

### evictions

> **evictions**: `number`

Defined in: [types/utilities.ts:286](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L286)

Number of entries evicted due to size limits

---

### expirations

> **expirations**: `number`

Defined in: [types/utilities.ts:288](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L288)

Number of entries expired due to TTL

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/utilities.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L290)

Total number of requests

---

### size

> **size**: `number`

Defined in: [types/utilities.ts:292](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L292)

Current number of entries in cache

---

### totalBytes

> **totalBytes**: `number`

Defined in: [types/utilities.ts:294](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L294)

Total size of cached images in bytes

---

### hitRate

> **hitRate**: `number`

Defined in: [types/utilities.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L296)

Cache hit rate as percentage
