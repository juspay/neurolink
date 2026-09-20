[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgVectorStoreOptions

# Type Alias: PgVectorStoreOptions

> **PgVectorStoreOptions** = `object`

Defined in: [types/rag.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L557)

Construction options for `PgVectorStore`.

## Properties

### tablePrefix?

> `optional` **tablePrefix?**: `string`

Defined in: [types/rag.ts:563](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L563)

Prefix prepended to `indexName` to derive the backing table name.
Must itself be a valid, unquoted Postgres identifier.

#### Default

```ts
"neurolink_vs_";
```
