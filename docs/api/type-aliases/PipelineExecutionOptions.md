[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PipelineExecutionOptions

# Type Alias: PipelineExecutionOptions

> **PipelineExecutionOptions** = `object`

Defined in: [types/evaluation.ts:330](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L330)

Pipeline execution options

## Properties

### correlationId?

> `optional` **correlationId?**: `string`

Defined in: [types/evaluation.ts:332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L332)

Correlation ID for tracing

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/evaluation.ts:334](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L334)

Custom timeout override

---

### skipScorers?

> `optional` **skipScorers?**: `string`[]

Defined in: [types/evaluation.ts:336](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L336)

Skip specific scorers. Mutually exclusive with onlyScorers.

---

### onlyScorers?

> `optional` **onlyScorers?**: `string`[]

Defined in: [types/evaluation.ts:338](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L338)

Only run specific scorers. Mutually exclusive with skipScorers.

---

### metadata?

> `optional` **metadata?**: [`JsonObject`](JsonObject.md)

Defined in: [types/evaluation.ts:340](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L340)

Additional metadata to attach
