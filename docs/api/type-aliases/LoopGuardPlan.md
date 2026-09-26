[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPlan

# Type Alias: LoopGuardPlan

> **LoopGuardPlan** = `object`

What the caller should do to reclaim budget. Indices refer to the input array.

## Properties

### fire

> **fire**: `boolean`

False when the loop is under threshold and nothing should change.

---

### truncate

> **truncate**: `number`[]

Entries whose payload should be replaced by a preview.

---

### drop

> **drop**: `number`[]

Entries to remove entirely — always whole batches, never a partial pair.

---

### projectedTokens

> **projectedTokens**: `number`

Estimated total after applying the plan, including fixed overhead.
