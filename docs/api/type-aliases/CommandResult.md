[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandResult

# Type Alias: CommandResult

> **CommandResult** = `object`

Defined in: [types/cli.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L410)

CLI command result

## Properties

### success

> **success**: `boolean`

Defined in: [types/cli.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L412)

Command success status

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/cli.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L414)

Result data

---

### error?

> `optional` **error?**: `string`

Defined in: [types/cli.ts:416](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L416)

Error message if failed

---

### content?

> `optional` **content?**: `string`

Defined in: [types/cli.ts:418](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L418)

Output content

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/cli.ts:420](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L420)

Execution metadata

#### executionTime?

> `optional` **executionTime?**: `number`

#### timestamp?

> `optional` **timestamp?**: `number`

#### command?

> `optional` **command?**: `string`
