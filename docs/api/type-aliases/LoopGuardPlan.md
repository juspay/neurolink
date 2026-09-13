[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPlan

# Type Alias: LoopGuardPlan

> **LoopGuardPlan** = `object`

Defined in: [types/context.ts:872](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L872)

What the caller should do to reclaim budget. Indices refer to the input array.

## Properties

### fire

> **fire**: `boolean`

Defined in: [types/context.ts:874](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L874)

False when the loop is under threshold and nothing should change.

---

### truncate

> **truncate**: `number`[]

Defined in: [types/context.ts:876](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L876)

Entries whose payload should be replaced by a preview.

---

### drop

> **drop**: `number`[]

Defined in: [types/context.ts:878](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L878)

Entries to remove entirely — always whole batches, never a partial pair.

---

### projectedTokens

> **projectedTokens**: `number`

Defined in: [types/context.ts:880](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L880)

Estimated total after applying the plan, including fixed overhead.
