[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandResult

# Type Alias: CommandResult

> **CommandResult** = `object`

Defined in: [types/cli.ts:404](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L404)

CLI command result

## Properties

### success

> **success**: `boolean`

Defined in: [types/cli.ts:406](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L406)

Command success status

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/cli.ts:408](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L408)

Result data

---

### error?

> `optional` **error?**: `string`

Defined in: [types/cli.ts:410](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L410)

Error message if failed

---

### content?

> `optional` **content?**: `string`

Defined in: [types/cli.ts:412](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L412)

Output content

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/cli.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L414)

Execution metadata

#### executionTime?

> `optional` **executionTime?**: `number`

#### timestamp?

> `optional` **timestamp?**: `number`

#### command?

> `optional` **command?**: `string`
