[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1396](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1396)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1397)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1398](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1398)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1399](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1399)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1400](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1400)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
