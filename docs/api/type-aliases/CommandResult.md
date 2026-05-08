[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CommandResult

# Type Alias: CommandResult

> **CommandResult** = `object`

Defined in: [types/cli.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L390)

CLI command result

## Properties

### success

> **success**: `boolean`

Defined in: [types/cli.ts:392](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L392)

Command success status

---

### data?

> `optional` **data?**: `unknown`

Defined in: [types/cli.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L394)

Result data

---

### error?

> `optional` **error?**: `string`

Defined in: [types/cli.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L396)

Error message if failed

---

### content?

> `optional` **content?**: `string`

Defined in: [types/cli.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L398)

Output content

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/cli.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L400)

Execution metadata

#### executionTime?

> `optional` **executionTime?**: `number`

#### timestamp?

> `optional` **timestamp?**: `number`

#### command?

> `optional` **command?**: `string`
