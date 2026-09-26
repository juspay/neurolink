[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1492](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1492)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1493](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1493)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1494](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1494)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1495)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1496](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1496)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
