[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CachedImage

# Type Alias: CachedImage

> **CachedImage** = `object`

Defined in: [types/utilities.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L248)

Cached image entry structure for image cache

## Properties

### dataUri

> **dataUri**: `string`

Defined in: [types/utilities.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L250)

The image data as a base64 data URI

---

### contentType

> **contentType**: `string`

Defined in: [types/utilities.ts:252](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L252)

Content type of the image (e.g., "image/jpeg")

---

### size

> **size**: `number`

Defined in: [types/utilities.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L254)

Size of the image in bytes

---

### contentHash

> **contentHash**: `string`

Defined in: [types/utilities.ts:256](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L256)

SHA-256 hash of the image content for deduplication

---

### createdAt

> **createdAt**: `number`

Defined in: [types/utilities.ts:258](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L258)

Timestamp when the entry was created

---

### lastAccessedAt

> **lastAccessedAt**: `number`

Defined in: [types/utilities.ts:260](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L260)

Timestamp of last access

---

### accessCount

> **accessCount**: `number`

Defined in: [types/utilities.ts:262](https://github.com/juspay/neurolink/blob/release/src/lib/types/utilities.ts#L262)

Number of times this entry was accessed
