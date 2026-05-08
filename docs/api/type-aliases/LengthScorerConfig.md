[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / LengthScorerConfig

# Type Alias: LengthScorerConfig

> **LengthScorerConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:606](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/scorer.ts#L606)

Configuration specific to length scoring.

## Type Declaration

### unit?

> `optional` **unit?**: [`LengthUnit`](LengthUnit.md)

### constraintType?

> `optional` **constraintType?**: [`LengthConstraintType`](LengthConstraintType.md)

### minLength?

> `optional` **minLength?**: `number`

### maxLength?

> `optional` **maxLength?**: `number`

### exactLength?

> `optional` **exactLength?**: `number`

### tolerance?

> `optional` **tolerance?**: `number`

### ratioTarget?

> `optional` **ratioTarget?**: `number`

### ratioReference?

> `optional` **ratioReference?**: `"query"` \| `"context"`

### scoringMode?

> `optional` **scoringMode?**: `"binary"` \| `"proportional"`
