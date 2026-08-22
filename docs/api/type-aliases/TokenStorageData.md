[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorageData

# Type Alias: TokenStorageData

> **TokenStorageData** = `object`

Defined in: [types/auth.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L64)

Internal storage format for multi-provider tokens

## Properties

### version

> **version**: `string`

Defined in: [types/auth.ts:66](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L66)

Version of the storage format

---

### lastModified

> **lastModified**: `number`

Defined in: [types/auth.ts:68](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L68)

Last modified timestamp

---

### providers

> **providers**: `Record`\<`string`, [`StoredProviderTokens`](StoredProviderTokens.md)\>

Defined in: [types/auth.ts:70](https://github.com/juspay/neurolink/blob/release/src/lib/types/auth.ts#L70)

Tokens indexed by provider name
