[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PineconeIndexLike

# Type Alias: PineconeIndexLike

> **PineconeIndexLike** = `object`

Defined in: [types/vectorStorePinecone.ts:47](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L47)

Minimal structural interface modeled on the `@pinecone-database/pinecone`
`Index` object. Satisfied by the real SDK's `Index` without modification;
callers never need to install the Pinecone SDK as a dependency of this
package — they bring their own already-constructed client instance.

## Methods

### namespace()?

> `optional` **namespace**(`ns`): `PineconeIndexLike`

Defined in: [types/vectorStorePinecone.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L49)

Returns a client scoped to the given namespace, if the client supports namespacing.

#### Parameters

##### ns

`string`

#### Returns

`PineconeIndexLike`

---

### query()

> **query**(`request`): `Promise`\<[`PineconeQueryResponse`](PineconeQueryResponse.md)\>

Defined in: [types/vectorStorePinecone.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L50)

#### Parameters

##### request

[`PineconeQueryRequest`](PineconeQueryRequest.md)

#### Returns

`Promise`\<[`PineconeQueryResponse`](PineconeQueryResponse.md)\>

---

### upsert()

> **upsert**(`records`): `Promise`\<`unknown`\>

Defined in: [types/vectorStorePinecone.ts:51](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L51)

#### Parameters

##### records

[`PineconeUpsertRecord`](PineconeUpsertRecord.md)[]

#### Returns

`Promise`\<`unknown`\>

---

### deleteMany()

> **deleteMany**(`ids`): `Promise`\<`unknown`\>

Defined in: [types/vectorStorePinecone.ts:52](https://github.com/juspay/neurolink/blob/release/src/lib/types/vectorStorePinecone.ts#L52)

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`unknown`\>
