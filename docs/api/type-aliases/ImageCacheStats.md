[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheStats

# Type Alias: ImageCacheStats

> **ImageCacheStats** = `object`

Defined in: [types/utilities.ts:266](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L266)

Cache statistics for monitoring

## Properties

### hits

> **hits**: `number`

Defined in: [types/utilities.ts:268](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L268)

Number of cache hits

---

### misses

> **misses**: `number`

Defined in: [types/utilities.ts:270](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L270)

Number of cache misses

---

### evictions

> **evictions**: `number`

Defined in: [types/utilities.ts:272](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L272)

Number of entries evicted due to size limits

---

### expirations

> **expirations**: `number`

Defined in: [types/utilities.ts:274](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L274)

Number of entries expired due to TTL

---

### totalRequests

> **totalRequests**: `number`

Defined in: [types/utilities.ts:276](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L276)

Total number of requests

---

### size

> **size**: `number`

Defined in: [types/utilities.ts:278](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L278)

Current number of entries in cache

---

### totalBytes

> **totalBytes**: `number`

Defined in: [types/utilities.ts:280](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L280)

Total size of cached images in bytes

---

### hitRate

> **hitRate**: `number`

Defined in: [types/utilities.ts:282](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L282)

Cache hit rate as percentage
