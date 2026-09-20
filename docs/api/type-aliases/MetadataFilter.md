[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataFilter

# Type Alias: MetadataFilter

> **MetadataFilter** = `object`

Defined in: [types/rag.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1201)

Metadata filter using MongoDB/Sift query syntax

## Indexable

> \[`field`: `string`\]: `unknown`

## Properties

### $eq?

> `optional` **$eq?**: `unknown`

Defined in: [types/rag.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1203)

---

### $ne?

> `optional` **$ne?**: `unknown`

Defined in: [types/rag.ts:1204](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1204)

---

### $gt?

> `optional` **$gt?**: `number`

Defined in: [types/rag.ts:1205](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1205)

---

### $gte?

> `optional` **$gte?**: `number`

Defined in: [types/rag.ts:1206](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1206)

---

### $lt?

> `optional` **$lt?**: `number`

Defined in: [types/rag.ts:1207](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1207)

---

### $lte?

> `optional` **$lte?**: `number`

Defined in: [types/rag.ts:1208](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1208)

---

### $in?

> `optional` **$in?**: `unknown`[]

Defined in: [types/rag.ts:1209](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1209)

---

### $nin?

> `optional` **$nin?**: `unknown`[]

Defined in: [types/rag.ts:1210](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1210)

---

### $and?

> `optional` **$and?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1213](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1213)

---

### $or?

> `optional` **$or?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1214](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1214)

---

### $not?

> `optional` **$not?**: `MetadataFilter`

Defined in: [types/rag.ts:1215](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1215)

---

### $nor?

> `optional` **$nor?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1216](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1216)

---

### $exists?

> `optional` **$exists?**: `boolean`

Defined in: [types/rag.ts:1219](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1219)

---

### $contains?

> `optional` **$contains?**: `string`

Defined in: [types/rag.ts:1220](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1220)

---

### $regex?

> `optional` **$regex?**: `string`

Defined in: [types/rag.ts:1221](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1221)

---

### $size?

> `optional` **$size?**: `number`

Defined in: [types/rag.ts:1222](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1222)
