[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PineconeQueryRequest

# Type Alias: PineconeQueryRequest

> **PineconeQueryRequest** = `object`

Defined in: [types/vectorStorePinecone.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L26)

Request payload accepted by `PineconeIndexLike.query()`.

## Properties

### vector

> **vector**: `number`[]

Defined in: [types/vectorStorePinecone.ts:27](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L27)

---

### topK

> **topK**: `number`

Defined in: [types/vectorStorePinecone.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L28)

---

### filter?

> `optional` **filter?**: `Record`\<`string`, `unknown`\>

Defined in: [types/vectorStorePinecone.ts:29](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L29)

---

### includeMetadata?

> `optional` **includeMetadata?**: `boolean`

Defined in: [types/vectorStorePinecone.ts:30](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L30)

---

### includeValues?

> `optional` **includeValues?**: `boolean`

Defined in: [types/vectorStorePinecone.ts:31](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L31)
