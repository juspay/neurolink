[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PgVectorStoreOptions

# Type Alias: PgVectorStoreOptions

> **PgVectorStoreOptions** = `object`

Construction options for `PgVectorStore`.

## Properties

### tablePrefix?

> `optional` **tablePrefix?**: `string`

Prefix prepended to `indexName` to derive the backing table name.
Must itself be a valid, unquoted Postgres identifier.

#### Default

```ts
"neurolink_vs_";
```
