[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CachedImage

# Type Alias: CachedImage

> **CachedImage** = `object`

Cached image entry structure for image cache

## Properties

### dataUri

> **dataUri**: `string`

The image data as a base64 data URI

---

### contentType

> **contentType**: `string`

Content type of the image (e.g., "image/jpeg")

---

### size

> **size**: `number`

Size of the image in bytes

---

### contentHash

> **contentHash**: `string`

SHA-256 hash of the image content for deduplication

---

### createdAt

> **createdAt**: `number`

Timestamp when the entry was created

---

### lastAccessedAt

> **lastAccessedAt**: `number`

Timestamp of last access

---

### accessCount

> **accessCount**: `number`

Number of times this entry was accessed
