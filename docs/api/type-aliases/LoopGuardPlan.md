[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardPlan

# Type Alias: LoopGuardPlan

> **LoopGuardPlan** = `object`

Defined in: [types/context.ts:886](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L886)

What the caller should do to reclaim budget. Indices refer to the input array.

## Properties

### fire

> **fire**: `boolean`

Defined in: [types/context.ts:888](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L888)

False when the loop is under threshold and nothing should change.

---

### truncate

> **truncate**: `number`[]

Defined in: [types/context.ts:890](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L890)

Entries whose payload should be replaced by a preview.

---

### drop

> **drop**: `number`[]

Defined in: [types/context.ts:892](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L892)

Entries to remove entirely — always whole batches, never a partial pair.

---

### projectedTokens

> **projectedTokens**: `number`

Defined in: [types/context.ts:894](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/context.ts#L894)

Estimated total after applying the plan, including fixed overhead.
