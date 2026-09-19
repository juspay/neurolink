[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1466)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1467)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1468)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1469](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1469)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1470](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1470)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
