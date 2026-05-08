[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryIntentAnalysis

# Type Alias: QueryIntentAnalysis

> **QueryIntentAnalysis** = `object`

Defined in: [types/evaluation.ts:173](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L173)

Represents the analysis of the user's query intent.
This provides a basic understanding of what the user is trying to achieve.

## Properties

### type

> **type**: `"question"` \| `"command"` \| `"greeting"` \| `"unknown"`

Defined in: [types/evaluation.ts:175](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L175)

The type of query, e.g., asking a question or giving a command.

---

### complexity

> **complexity**: `"low"` \| `"medium"` \| `"high"`

Defined in: [types/evaluation.ts:177](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L177)

The estimated complexity of the query.

---

### shouldHaveUsedTools

> **shouldHaveUsedTools**: `boolean`

Defined in: [types/evaluation.ts:179](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L179)

Whether the query likely required the use of tools to be answered correctly.
