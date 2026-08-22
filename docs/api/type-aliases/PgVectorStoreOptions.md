[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgVectorStoreOptions

# Type Alias: PgVectorStoreOptions

> **PgVectorStoreOptions** = `object`

Defined in: [types/rag.ts:519](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L519)

Construction options for `PgVectorStore`.

## Properties

### tablePrefix?

> `optional` **tablePrefix?**: `string`

Defined in: [types/rag.ts:525](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L525)

Prefix prepended to `indexName` to derive the backing table name.
Must itself be a valid, unquoted Postgres identifier.

#### Default

```ts
"neurolink_vs_";
```
