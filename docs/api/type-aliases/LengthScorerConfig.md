[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LengthScorerConfig

# Type Alias: LengthScorerConfig

> **LengthScorerConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:606](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/scorer.ts#L606)

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
