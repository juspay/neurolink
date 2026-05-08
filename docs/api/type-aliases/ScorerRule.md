[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerRule

# Type Alias: ScorerRule

> **ScorerRule** = `object`

Defined in: [types/scorer.ts:191](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L191)

Individual rule for rule-based scorers

## Properties

### id

> **id**: `string`

Defined in: [types/scorer.ts:193](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L193)

Rule identifier

---

### description

> **description**: `string`

Defined in: [types/scorer.ts:195](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L195)

Rule description

---

### type

> **type**: `"regex"` \| `"keyword"` \| `"length"` \| `"custom"`

Defined in: [types/scorer.ts:197](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L197)

Rule type

---

### params

> **params**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:199](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L199)

Rule parameters

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/scorer.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L201)

Weight for this rule
