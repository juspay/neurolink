[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgClientLike

# Type Alias: PgClientLike

> **PgClientLike** = `object`

Defined in: [types/rag.ts:514](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L514)

Minimal structural interface a caller-supplied Postgres client must
satisfy. Both `pg.Pool` (`node-postgres`) and `@electric-sql/pglite`
instances already expose a compatible `query(text, values?)` method —
neither is a dependency of this package. Callers construct and own the
client; `PgVectorStore` only ever calls `query()` on it.

## Methods

### query()

> **query**(`text`, `values?`): `Promise`\<[`PgQueryResult`](PgQueryResult.md)\<`unknown`\>\>

Defined in: [types/rag.ts:515](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L515)

#### Parameters

##### text

`string`

##### values?

`unknown`[]

#### Returns

`Promise`\<[`PgQueryResult`](PgQueryResult.md)\<`unknown`\>\>
