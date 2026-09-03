[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KnowledgeScoredCandidate

# Type Alias: KnowledgeScoredCandidate

> **KnowledgeScoredCandidate** = `object`

Defined in: [types/knowledge.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L453)

One scored retrieval candidate with its signal breakdown, for traces.

## Properties

### id

> **id**: `string`

Defined in: [types/knowledge.ts:454](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L454)

---

### score

> **score**: `number`

Defined in: [types/knowledge.ts:455](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L455)

---

### exact

> **exact**: `boolean`

Defined in: [types/knowledge.ts:456](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L456)

---

### alias

> **alias**: `boolean`

Defined in: [types/knowledge.ts:457](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L457)

---

### lexical

> **lexical**: `number`

Defined in: [types/knowledge.ts:458](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L458)

---

### fieldScores

> **fieldScores**: `Partial`\<`Record`\<[`KnowledgeFieldName`](KnowledgeFieldName.md), `number`\>\>

Defined in: [types/knowledge.ts:459](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L459)

---

### matchedPhrases

> **matchedPhrases**: `string`[]

Defined in: [types/knowledge.ts:460](https://github.com/juspay/neurolink/blob/release/src/lib/types/knowledge.ts#L460)
