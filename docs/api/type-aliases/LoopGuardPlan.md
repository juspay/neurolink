[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPlan

# Type Alias: LoopGuardPlan

> **LoopGuardPlan** = `object`

Defined in: [types/context.ts:895](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L895)

What the caller should do to reclaim budget. Indices refer to the input array.

## Properties

### fire

> **fire**: `boolean`

Defined in: [types/context.ts:897](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L897)

False when the loop is under threshold and nothing should change.

---

### truncate

> **truncate**: `number`[]

Defined in: [types/context.ts:899](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L899)

Entries whose payload should be replaced by a preview.

---

### drop

> **drop**: `number`[]

Defined in: [types/context.ts:901](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L901)

Entries to remove entirely — always whole batches, never a partial pair.

---

### projectedTokens

> **projectedTokens**: `number`

Defined in: [types/context.ts:903](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L903)

Estimated total after applying the plan, including fixed overhead.
