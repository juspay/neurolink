[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TaskClassification

# Type Alias: TaskClassification

> **TaskClassification** = `object`

Defined in: [types/taskClassification.ts:14](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L14)

Result of task classification analysis

## Properties

### type

> **type**: [`TaskType`](TaskType.md)

Defined in: [types/taskClassification.ts:16](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L16)

The classified task type

---

### confidence

> **confidence**: `number`

Defined in: [types/taskClassification.ts:18](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L18)

Confidence score (0-1) in the classification

---

### reasoning

> **reasoning**: `string`

Defined in: [types/taskClassification.ts:20](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L20)

Human-readable explanation of the classification decision
