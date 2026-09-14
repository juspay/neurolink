[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1461](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1461)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1462](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1462)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1463](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1463)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1464)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1465)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
