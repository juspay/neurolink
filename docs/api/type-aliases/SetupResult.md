[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SetupResult

# Type Alias: SetupResult

> **SetupResult** = `object`

Defined in: [types/cli.ts:1442](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1442)

## Properties

### selectedProviders

> **selectedProviders**: [`AIProviderName`](../enumerations/AIProviderName.md)[]

Defined in: [types/cli.ts:1443](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1443)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1444)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1445)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1446)

#### provider

> **provider**: [`AIProviderName`](../enumerations/AIProviderName.md)

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
