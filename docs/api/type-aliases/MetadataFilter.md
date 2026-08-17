[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataFilter

# Type Alias: MetadataFilter

> **MetadataFilter** = `object`

Defined in: [types/rag.ts:1182](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1182)

Metadata filter using MongoDB/Sift query syntax

## Indexable

> \[`field`: `string`\]: `unknown`

## Properties

### $eq?

> `optional` **$eq?**: `unknown`

Defined in: [types/rag.ts:1184](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1184)

---

### $ne?

> `optional` **$ne?**: `unknown`

Defined in: [types/rag.ts:1185](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1185)

---

### $gt?

> `optional` **$gt?**: `number`

Defined in: [types/rag.ts:1186](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1186)

---

### $gte?

> `optional` **$gte?**: `number`

Defined in: [types/rag.ts:1187](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1187)

---

### $lt?

> `optional` **$lt?**: `number`

Defined in: [types/rag.ts:1188](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1188)

---

### $lte?

> `optional` **$lte?**: `number`

Defined in: [types/rag.ts:1189](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1189)

---

### $in?

> `optional` **$in?**: `unknown`[]

Defined in: [types/rag.ts:1190](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1190)

---

### $nin?

> `optional` **$nin?**: `unknown`[]

Defined in: [types/rag.ts:1191](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1191)

---

### $and?

> `optional` **$and?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1194](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1194)

---

### $or?

> `optional` **$or?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1195](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1195)

---

### $not?

> `optional` **$not?**: `MetadataFilter`

Defined in: [types/rag.ts:1196](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1196)

---

### $nor?

> `optional` **$nor?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1197](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1197)

---

### $exists?

> `optional` **$exists?**: `boolean`

Defined in: [types/rag.ts:1200](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1200)

---

### $contains?

> `optional` **$contains?**: `string`

Defined in: [types/rag.ts:1201](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1201)

---

### $regex?

> `optional` **$regex?**: `string`

Defined in: [types/rag.ts:1202](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1202)

---

### $size?

> `optional` **$size?**: `number`

Defined in: [types/rag.ts:1203](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L1203)
