[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassificationScores

# Type Alias: ClassificationScores

> **ClassificationScores** = `object`

Defined in: [types/taskClassification.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/taskClassification.ts#L26)

Internal scoring data used during classification analysis

## Properties

### fastScore

> **fastScore**: `number`

Defined in: [types/taskClassification.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/taskClassification.ts#L28)

Score indicating likelihood of fast task

---

### reasoningScore

> **reasoningScore**: `number`

Defined in: [types/taskClassification.ts:30](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/taskClassification.ts#L30)

Score indicating likelihood of reasoning task

---

### reasons

> **reasons**: `string`[]

Defined in: [types/taskClassification.ts:32](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/taskClassification.ts#L32)

Array of reasons contributing to the scores
