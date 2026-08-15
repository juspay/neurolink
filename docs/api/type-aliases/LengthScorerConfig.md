[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LengthScorerConfig

# Type Alias: LengthScorerConfig

> **LengthScorerConfig** = [`RuleScorerConfig`](RuleScorerConfig.md) & `object`

Defined in: [types/scorer.ts:606](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/scorer.ts#L606)

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
