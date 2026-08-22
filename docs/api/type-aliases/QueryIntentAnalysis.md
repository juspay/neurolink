[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / QueryIntentAnalysis

# Type Alias: QueryIntentAnalysis

> **QueryIntentAnalysis** = `object`

Defined in: [types/evaluation.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L168)

Represents the analysis of the user's query intent.
This provides a basic understanding of what the user is trying to achieve.

## Properties

### type

> **type**: `"question"` \| `"command"` \| `"greeting"` \| `"unknown"`

Defined in: [types/evaluation.ts:170](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L170)

The type of query, e.g., asking a question or giving a command.

---

### complexity

> **complexity**: `"low"` \| `"medium"` \| `"high"`

Defined in: [types/evaluation.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L172)

The estimated complexity of the query.

---

### shouldHaveUsedTools

> **shouldHaveUsedTools**: `boolean`

Defined in: [types/evaluation.ts:174](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L174)

Whether the query likely required the use of tools to be answered correctly.
