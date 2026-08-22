[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeLexicalMatch

# Type Alias: KnowledgeLexicalMatch

> **KnowledgeLexicalMatch** = `object`

Defined in: [types/knowledge.ts:294](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L294)

One lexical match with its per-field score breakdown, for tuning and traces.

## Properties

### id

> **id**: `string`

Defined in: [types/knowledge.ts:295](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L295)

---

### score

> **score**: `number`

Defined in: [types/knowledge.ts:296](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L296)

---

### fieldScores

> **fieldScores**: `Partial`\<`Record`\<[`KnowledgeFieldName`](KnowledgeFieldName.md), `number`\>\>

Defined in: [types/knowledge.ts:297](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/knowledge.ts#L297)
