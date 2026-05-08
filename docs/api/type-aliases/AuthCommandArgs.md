[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthCommandArgs

# Type Alias: AuthCommandArgs

> **AuthCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:985](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/cli.ts#L985)

Auth command arguments interface

## Type Declaration

### provider?

> `optional` **provider?**: `string`

### method?

> `optional` **method?**: `"api-key"` \| `"oauth"` \| `"create-api-key"`

### format?

> `optional` **format?**: `"text"` \| `"json"`

### quiet?

> `optional` **quiet?**: `boolean`

### debug?

> `optional` **debug?**: `boolean`

### nonInteractive?

> `optional` **nonInteractive?**: `boolean`

### add?

> `optional` **add?**: `boolean`

### label?

> `optional` **label?**: `string`

### account?

> `optional` **account?**: `string`

### force?

> `optional` **force?**: `boolean`

### \_?

> `optional` **\_?**: (`string` \| `number`)[]

Yargs positional arguments
