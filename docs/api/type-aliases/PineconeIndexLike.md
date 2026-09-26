[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PineconeIndexLike

# Type Alias: PineconeIndexLike

> **PineconeIndexLike** = `object`

Minimal structural interface modeled on the `@pinecone-database/pinecone`
`Index` object. Satisfied by the real SDK's `Index` without modification;
callers never need to install the Pinecone SDK as a dependency of this
package — they bring their own already-constructed client instance.

## Methods

### namespace()?

> `optional` **namespace**(`ns`): `PineconeIndexLike`

Returns a client scoped to the given namespace, if the client supports namespacing.

#### Parameters

##### ns

`string`

#### Returns

`PineconeIndexLike`

---

### query()

> **query**(`request`): `Promise`\<[`PineconeQueryResponse`](PineconeQueryResponse.md)\>

#### Parameters

##### request

[`PineconeQueryRequest`](PineconeQueryRequest.md)

#### Returns

`Promise`\<[`PineconeQueryResponse`](PineconeQueryResponse.md)\>

---

### upsert()

> **upsert**(`records`): `Promise`\<`unknown`\>

#### Parameters

##### records

[`PineconeUpsertRecord`](PineconeUpsertRecord.md)[]

#### Returns

`Promise`\<`unknown`\>

---

### deleteMany()

> **deleteMany**(`ids`): `Promise`\<`unknown`\>

#### Parameters

##### ids

`string`[]

#### Returns

`Promise`\<`unknown`\>
