[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgVectorStoreOptions

# Type Alias: PgVectorStoreOptions

> **PgVectorStoreOptions** = `object`

Defined in: [types/rag.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L538)

Construction options for `PgVectorStore`.

## Properties

### tablePrefix?

> `optional` **tablePrefix?**: `string`

Defined in: [types/rag.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L544)

Prefix prepended to `indexName` to derive the backing table name.
Must itself be a valid, unquoted Postgres identifier.

#### Default

```ts
"neurolink_vs_";
```
