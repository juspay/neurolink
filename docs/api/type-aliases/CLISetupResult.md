[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CLISetupResult

# Type Alias: CLISetupResult

> **CLISetupResult** = `object`

Interactive setup result

## Properties

### selectedProviders

> **selectedProviders**: `string`[]

---

### credentials

> **credentials**: `Record`\<`string`, `string`\>

---

### envFileBackup?

> `optional` **envFileBackup?**: `string`

---

### testResults

> **testResults**: `object`[]

#### provider

> **provider**: `string`

#### status

> **status**: `"working"` \| `"failed"`

#### error?

> `optional` **error?**: `string`

#### responseTime?

> `optional` **responseTime?**: `number`
