[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProcessResult

# Type Alias: ProcessResult

> **ProcessResult** = `object`

Result of executing a child process (shell command).

## Properties

### code

> **code**: `number` \| `null`

Exit code of the process

---

### stdout

> **stdout**: `string`

Standard output

---

### stderr

> **stderr**: `string`

Standard error output

---

### success

> **success**: `boolean`

Whether the process exited successfully (code === 0)
