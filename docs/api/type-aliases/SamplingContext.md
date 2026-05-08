[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / SamplingContext

# Type Alias: SamplingContext

> **SamplingContext** = `object`

Defined in: [types/scorer.ts:415](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L415)

Sampling context for adaptive sampling

## Properties

### recentScores?

> `optional` **recentScores?**: `number`[]

Defined in: [types/scorer.ts:417](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L417)

Recent quality scores

---

### userId?

> `optional` **userId?**: `string`

Defined in: [types/scorer.ts:419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L419)

User ID if available

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/scorer.ts:421](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L421)

Tags for this request

---

### hasError?

> `optional` **hasError?**: `boolean`

Defined in: [types/scorer.ts:423](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L423)

Whether this request errored
