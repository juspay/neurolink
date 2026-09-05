[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1446)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1447)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1448)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1449)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1450)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
