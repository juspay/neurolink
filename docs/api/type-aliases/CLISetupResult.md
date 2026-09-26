[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CLISetupResult

# Type Alias: CLISetupResult

> **CLISetupResult** = `object`

Defined in: [types/cli.ts:665](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L665)

Interactive setup result

## Properties

### selectedProviders

> **selectedProviders**: `string`[]

Defined in: [types/cli.ts:666](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L666)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:667](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L667)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:668](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L668)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:669](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L669)

#### provider

> **provider**: `string`

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
