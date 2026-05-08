[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CachedImage

# Type Alias: CachedImage

> **CachedImage** = `object`

Defined in: [types/utilities.ts:234](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L234)

Cached image entry structure for image cache

## Properties

### dataUri

> **dataUri**: `string`

Defined in: [types/utilities.ts:236](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L236)

The image data as a base64 data URI

---

### contentType

> **contentType**: `string`

Defined in: [types/utilities.ts:238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L238)

Content type of the image (e.g., "image/jpeg")

---

### size

> **size**: `number`

Defined in: [types/utilities.ts:240](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L240)

Size of the image in bytes

---

### contentHash

> **contentHash**: `string`

Defined in: [types/utilities.ts:242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L242)

SHA-256 hash of the image content for deduplication

---

### createdAt

> **createdAt**: `number`

Defined in: [types/utilities.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L244)

Timestamp when the entry was created

---

### lastAccessedAt

> **lastAccessedAt**: `number`

Defined in: [types/utilities.ts:246](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L246)

Timestamp of last access

---

### accessCount

> **accessCount**: `number`

Defined in: [types/utilities.ts:248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/utilities.ts#L248)

Number of times this entry was accessed
