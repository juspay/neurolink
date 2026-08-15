[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineExecutionOptions

# Type Alias: PipelineExecutionOptions

> **PipelineExecutionOptions** = `object`

Defined in: [types/evaluation.ts:325](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L325)

Pipeline execution options

## Properties

### correlationId?

> `optional` **correlationId?**: `string`

Defined in: [types/evaluation.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L327)

Correlation ID for tracing

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/evaluation.ts:329](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L329)

Custom timeout override

---

### skipScorers?

> `optional` **skipScorers?**: `string`[]

Defined in: [types/evaluation.ts:331](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L331)

Skip specific scorers. Mutually exclusive with onlyScorers.

---

### onlyScorers?

> `optional` **onlyScorers?**: `string`[]

Defined in: [types/evaluation.ts:333](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L333)

Only run specific scorers. Mutually exclusive with skipScorers.

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/evaluation.ts:335](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/evaluation.ts#L335)

Additional metadata to attach
