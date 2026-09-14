[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CLISetupResult

# Type Alias: CLISetupResult

> **CLISetupResult** = `object`

Defined in: [types/cli.ts:659](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L659)

Interactive setup result

## Properties

### selectedProviders

> **selectedProviders**: `string`[]

Defined in: [types/cli.ts:660](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L660)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:661](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L661)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L662)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L663)

#### provider

> **provider**: `string`

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
