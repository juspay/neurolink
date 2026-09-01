[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgClientLike

# Type Alias: PgClientLike

> **PgClientLike** = `object`

Defined in: [types/rag.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L533)

Minimal structural interface a caller-supplied Postgres client must
satisfy. Both `pg.Pool` (`node-postgres`) and `@electric-sql/pglite`
instances already expose a compatible `query(text, values?)` method —
neither is a dependency of this package. Callers construct and own the
client; `PgVectorStore` only ever calls `query()` on it.

## Methods

### query()

> **query**(`text`, `values?`): `Promise`\<[`PgQueryResult`](PgQueryResult.md)\<`unknown`\>\>

Defined in: [types/rag.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L534)

#### Parameters

##### text

`string`

##### values?

`unknown`[]

#### Returns

`Promise`\<[`PgQueryResult`](PgQueryResult.md)\<`unknown`\>\>
