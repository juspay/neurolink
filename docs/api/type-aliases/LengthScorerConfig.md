[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LengthScorerConfig

# Type Alias: LengthScorerConfig

> **LengthScorerConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/scorer.ts#L606)

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
