[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1464](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1464)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1465](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1465)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1466](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1466)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1467](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1467)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1468](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1468)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
