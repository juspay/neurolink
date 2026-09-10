[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1449)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1450)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1451)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1452)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1453)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
