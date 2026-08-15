[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SageMakerCommandArgs

# Type Alias: SageMakerCommandArgs

> **SageMakerCommandArgs** = [`BaseCommandArgs`](BaseCommandArgs.md) & `object`

Defined in: [types/cli.ts:344](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/cli.ts#L344)

SageMaker command arguments

## Type Declaration

### endpoint?

> `optional` **endpoint?**: `string`

SageMaker endpoint name

### model?

> `optional` **model?**: `string`

Model name for the endpoint

### prompt?

> `optional` **prompt?**: `string`

Test prompt for endpoint testing

### list?

> `optional` **list?**: `boolean`

List endpoints

### config?

> `optional` **config?**: `boolean`

Show configuration

### setup?

> `optional` **setup?**: `boolean`

Setup configuration

### clearCache?

> `optional` **clearCache?**: `boolean`

Clear configuration cache

### benchmark?

> `optional` **benchmark?**: `boolean`

Run benchmark test

### duration?

> `optional` **duration?**: `number`

Duration for benchmark test (in seconds)

### concurrency?

> `optional` **concurrency?**: `number`

Concurrency level for benchmark

### requests?

> `optional` **requests?**: `number`

Number of requests for benchmark

### maxTokens?

> `optional` **maxTokens?**: `number`

Maximum tokens per request

### validate?

> `optional` **validate?**: `boolean`

Validate endpoint configuration

### region?

> `optional` **region?**: `string`

AWS region override

### force?

> `optional` **force?**: `boolean`

Force operation without confirmation
