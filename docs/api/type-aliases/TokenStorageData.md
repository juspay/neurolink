[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenStorageData

# Type Alias: TokenStorageData

> **TokenStorageData** = `object`

Defined in: [types/auth.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L64)

Internal storage format for multi-provider tokens

## Properties

### version

> **version**: `string`

Defined in: [types/auth.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L66)

Version of the storage format

---

### lastModified

> **lastModified**: `number`

Defined in: [types/auth.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L68)

Last modified timestamp

---

### providers

> **providers**: `Record`\<`string`, [`StoredProviderTokens`](StoredProviderTokens.md)\>

Defined in: [types/auth.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L70)

Tokens indexed by provider name
