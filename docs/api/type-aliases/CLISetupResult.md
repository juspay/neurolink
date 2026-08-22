[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CLISetupResult

# Type Alias: CLISetupResult

> **CLISetupResult** = `object`

Defined in: [types/cli.ts:657](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L657)

Interactive setup result

## Properties

### selectedProviders

> **selectedProviders**: `string`[]

Defined in: [types/cli.ts:658](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L658)

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

Defined in: [types/cli.ts:659](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L659)

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

Defined in: [types/cli.ts:660](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L660)

---

### testResults

> **testResults**: `object`[]

Defined in: [types/cli.ts:661](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/cli.ts#L661)

#### provider

> **provider**: `string`

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
