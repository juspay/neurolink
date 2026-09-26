[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageCacheStats

# Type Alias: ImageCacheStats

> **ImageCacheStats** = `object`

Cache statistics for monitoring

## Properties

### hits

> **hits**: `number`

Number of cache hits

---

### misses

> **misses**: `number`

Number of cache misses

---

### evictions

> **evictions**: `number`

Number of entries evicted due to size limits

---

### expirations

> **expirations**: `number`

Number of entries expired due to TTL

---

### totalRequests

> **totalRequests**: `number`

Total number of requests

---

### size

> **size**: `number`

Current number of entries in cache

---

### totalBytes

> **totalBytes**: `number`

Total size of cached images in bytes

---

### hitRate

> **hitRate**: `number`

Cache hit rate as percentage
