[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingContext

# Type Alias: SamplingContext

> **SamplingContext** = `object`

Defined in: [types/scorer.ts:415](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L415)

Sampling context for adaptive sampling

## Properties

### recentScores?

> `optional` **recentScores?**: `number`[]

Defined in: [types/scorer.ts:417](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L417)

Recent quality scores

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/scorer.ts:419](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L419)

User ID if available

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/scorer.ts:421](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L421)

Tags for this request

---

### hasError?

> `optional` **hasError?**: `boolean`

Defined in: [types/scorer.ts:423](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L423)

Whether this request errored
