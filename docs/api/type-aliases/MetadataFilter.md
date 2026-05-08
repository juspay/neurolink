[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MetadataFilter

# Type Alias: MetadataFilter

> **MetadataFilter** = `object`

Defined in: [types/rag.ts:1119](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1119)

Metadata filter using MongoDB/Sift query syntax

## Indexable

> \[`field`: `string`\]: `unknown`

## Properties

### $eq?

> `optional` **$eq?**: `unknown`

Defined in: [types/rag.ts:1121](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1121)

---

### $ne?

> `optional` **$ne?**: `unknown`

Defined in: [types/rag.ts:1122](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1122)

---

### $gt?

> `optional` **$gt?**: `number`

Defined in: [types/rag.ts:1123](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1123)

---

### $gte?

> `optional` **$gte?**: `number`

Defined in: [types/rag.ts:1124](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1124)

---

### $lt?

> `optional` **$lt?**: `number`

Defined in: [types/rag.ts:1125](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1125)

---

### $lte?

> `optional` **$lte?**: `number`

Defined in: [types/rag.ts:1126](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1126)

---

### $in?

> `optional` **$in?**: `unknown`[]

Defined in: [types/rag.ts:1127](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1127)

---

### $nin?

> `optional` **$nin?**: `unknown`[]

Defined in: [types/rag.ts:1128](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1128)

---

### $and?

> `optional` **$and?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1131](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1131)

---

### $or?

> `optional` **$or?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1132](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1132)

---

### $not?

> `optional` **$not?**: `MetadataFilter`

Defined in: [types/rag.ts:1133](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1133)

---

### $nor?

> `optional` **$nor?**: `MetadataFilter`[]

Defined in: [types/rag.ts:1134](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1134)

---

### $exists?

> `optional` **$exists?**: `boolean`

Defined in: [types/rag.ts:1137](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1137)

---

### $contains?

> `optional` **$contains?**: `string`

Defined in: [types/rag.ts:1138](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1138)

---

### $regex?

> `optional` **$regex?**: `string`

Defined in: [types/rag.ts:1139](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1139)

---

### $size?

> `optional` **$size?**: `number`

Defined in: [types/rag.ts:1140](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L1140)
