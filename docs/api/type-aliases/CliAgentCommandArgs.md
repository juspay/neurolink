[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliAgentCommandArgs

# Type Alias: CliAgentCommandArgs

> **CliAgentCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:1981](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1981)

Agent command arguments for multi-agent orchestration

## Type Declaration

### id?

> `optional` **id?**: `string`

Agent ID

### name?

> `optional` **name?**: `string`

Agent name

### description?

> `optional` **description?**: `string`

Agent description

### instructions?

> `optional` **instructions?**: `string`

Agent instructions/system prompt

### provider?

> `optional` **provider?**: `string`

AI provider to use

### model?

> `optional` **model?**: `string`

Model name

### tools?

> `optional` **tools?**: `string`[]

Tools available to the agent

### maxSteps?

> `optional` **maxSteps?**: `number`

Maximum execution steps

### temperature?

> `optional` **temperature?**: `number`

Temperature setting

### input?

> `optional` **input?**: `string`

Input prompt for execution

### context?

> `optional` **context?**: `string`

Context data as JSON

### file?

> `optional` **file?**: `string`

Agent definition file path

### output?

> `optional` **output?**: `string`

Output file path

### stream?

> `optional` **stream?**: `boolean`

Enable streaming output

### detailed?

> `optional` **detailed?**: `boolean`

Show detailed information
