[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassificationScores

# Type Alias: ClassificationScores

> **ClassificationScores** = `object`

Defined in: [types/taskClassification.ts:26](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L26)

Internal scoring data used during classification analysis

## Properties

### fastScore

> **fastScore**: `number`

Defined in: [types/taskClassification.ts:28](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L28)

Score indicating likelihood of fast task

---

### reasoningScore

> **reasoningScore**: `number`

Defined in: [types/taskClassification.ts:30](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L30)

Score indicating likelihood of reasoning task

---

### reasons

> **reasons**: `string`[]

Defined in: [types/taskClassification.ts:32](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/taskClassification.ts#L32)

Array of reasons contributing to the scores
