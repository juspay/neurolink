[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1486](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1486)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1487](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1487)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1488](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1488)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1489](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1489)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1490](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1490)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
