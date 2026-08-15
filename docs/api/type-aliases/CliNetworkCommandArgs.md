[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliNetworkCommandArgs

# Type Alias: CliNetworkCommandArgs

> **CliNetworkCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:2017](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L2017)

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
