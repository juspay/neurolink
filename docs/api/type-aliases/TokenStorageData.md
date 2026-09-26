[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorageData

# Type Alias: TokenStorageData

> **TokenStorageData** = `object`

Internal storage format for multi-provider tokens

## Properties

### version

> **version**: `string`

Version of the storage format

---

### lastModified

> **lastModified**: `number`

Last modified timestamp

---

### providers

> **providers**: `Record`\<`string`, [`StoredProviderTokens`](StoredProviderTokens.md)\>

Tokens indexed by provider name
