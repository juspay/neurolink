[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorageData

# Type Alias: TokenStorageData

> **TokenStorageData** = `object`

Defined in: [types/auth.ts:64](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L64)

Internal storage format for multi-provider tokens

## Properties

### version

> **version**: `string`

Defined in: [types/auth.ts:66](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L66)

Version of the storage format

---

### lastModified

> **lastModified**: `number`

Defined in: [types/auth.ts:68](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L68)

Last modified timestamp

---

### providers

> **providers**: `Record`\<`string`, [`StoredProviderTokens`](StoredProviderTokens.md)\>

Defined in: [types/auth.ts:70](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/auth.ts#L70)

Tokens indexed by provider name
