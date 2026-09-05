[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliNetworkCommandArgs

# Type Alias: CliNetworkCommandArgs

> **CliNetworkCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L2067)

Network command arguments for agent network orchestration

## Type Declaration

### id?

> `optional` **id?**: `string`

Network ID

### name?

> `optional` **name?**: `string`

Network name

### description?

> `optional` **description?**: `string`

Network description

### file?

> `optional` **file?**: `string`

Network configuration file path

### input?

> `optional` **input?**: `string`

Input message for execution

### maxSteps?

> `optional` **maxSteps?**: `number`

Maximum execution steps

### timeout?

> `optional` **timeout?**: `number`

Execution timeout in ms

### context?

> `optional` **context?**: `string`

Context data as JSON

### output?

> `optional` **output?**: `string`

Output file path

### stream?

> `optional` **stream?**: `boolean`

Enable streaming output

### routerProvider?

> `optional` **routerProvider?**: `string`

Router provider

### routerModel?

> `optional` **routerModel?**: `string`

Router model

### detailed?

> `optional` **detailed?**: `boolean`

Show detailed information
