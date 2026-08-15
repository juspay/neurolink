[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PineconeVectorStore

# Class: PineconeVectorStore

Defined in: [rag/stores/pinecone.ts:137](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/stores/pinecone.ts#L137)

Pinecone-backed implementation of the `VectorStore` contract.

## Example

```typescript
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeVectorStore } from '@juspay/neurolink/rag';

const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const store = new PineconeVectorStore(client.index('my-index'));

await store.upsert('tenant-a', [{ id: '1', vector: [...], metadata: { text: 'hello' } }]);
const results = await store.query({ indexName: 'tenant-a', queryVector: [...], topK: 5 });
```

## Implements

- [`VectorStore`](../type-aliases/VectorStore.md)

## Constructors

### Constructor

> **new PineconeVectorStore**(`client`): `PineconeVectorStore`

Defined in: [rag/stores/pinecone.ts:138](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/stores/pinecone.ts#L138)

#### Parameters

##### client

[`PineconeIndexLike`](../type-aliases/PineconeIndexLike.md)

#### Returns

`PineconeVectorStore`

## Methods

### query()

> **query**(`params`): `Promise`\<[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]\>

Defined in: [rag/stores/pinecone.ts:147](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/stores/pinecone.ts#L147)

#### Parameters

##### params

###### indexName

`string`

###### queryVector

`number`[]

###### topK?

`number`

###### filter?

[`MetadataFilter`](../type-aliases/MetadataFilter.md)

###### includeVectors?

`boolean`

#### Returns

`Promise`\<[`VectorQueryResult`](../type-aliases/VectorQueryResult.md)[]\>

#### Implementation of

`VectorStore.query`

---

### upsert()

> **upsert**(`indexName`, `items`): `Promise`\<`void`\>

Defined in: [rag/stores/pinecone.ts:185](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/stores/pinecone.ts#L185)

Add or update vectors in the namespace mapped from `indexName`.

#### Parameters

##### indexName

`string`

##### items

`object`[]

#### Returns

`Promise`\<`void`\>

---

### delete()

> **delete**(`indexName`, `ids`): `Promise`\<`void`\>

Defined in: [rag/stores/pinecone.ts:204](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/stores/pinecone.ts#L204)

Delete vectors by id from the namespace mapped from `indexName`.

#### Parameters

##### indexName

`string`

##### ids

`string`[]

#### Returns

`Promise`\<`void`\>
