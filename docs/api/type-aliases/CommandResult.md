[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandResult

# Type Alias: CommandResult

> **CommandResult** = `object`

CLI command result

## Properties

### success

> **success**: `boolean`

Command success status

---

### data?

> `optional` **data?**: `unknown`

Result data

---

### error?

> `optional` **error?**: `string`

Error message if failed

---

### content?

> `optional` **content?**: `string`

Output content

---

### metadata?

> `optional` **metadata?**: `object`

Execution metadata

#### executionTime?

> `optional` **executionTime?**: `number`

#### timestamp?

> `optional` **timestamp?**: `number`

#### command?

> `optional` **command?**: `string`
