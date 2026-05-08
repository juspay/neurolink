[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ScorerConfig

# Type Alias: ScorerConfig

> **ScorerConfig** = `object`

Defined in: [types/scorer.ts:101](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L101)

Scorer configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/scorer.ts:103](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L103)

Whether the scorer is enabled

---

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/scorer.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L105)

Pass/fail threshold (0-1 normalized)

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/scorer.ts:107](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L107)

Weight for weighted aggregation

---

### options?

> `optional` **options?**: [`JsonObject`](JsonObject.md)

Defined in: [types/scorer.ts:109](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L109)

Custom scorer-specific configuration

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/scorer.ts:111](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L111)

Timeout for scorer execution (ms)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/scorer.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L113)

Number of retry attempts
