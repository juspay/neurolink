[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGrokTurn

# Type Alias: LocalUsageGrokTurn

> **LocalUsageGrokTurn** = `object`

Defined in: [types/localUsage.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L382)

One Grok Build completed turn after validation: every count a finite,
non-negative safe integer, and the `modelUsage` keys collected. `turns` is
the ledger's `numTurns`, which decides whether the next record continues
this process run or starts a fresh one — see `grokReader.ts`.

## Properties

### input

> **input**: `number`

Defined in: [types/localUsage.ts:383](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L383)

---

### output

> **output**: `number`

Defined in: [types/localUsage.ts:384](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L384)

---

### cacheRead

> **cacheRead**: `number`

Defined in: [types/localUsage.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L385)

---

### cacheCreation

> **cacheCreation**: `number`

Defined in: [types/localUsage.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L386)

---

### calls

> **calls**: `number`

Defined in: [types/localUsage.ts:387](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L387)

---

### turns

> **turns**: `number`

Defined in: [types/localUsage.ts:388](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L388)

---

### models

> **models**: `string`[]

Defined in: [types/localUsage.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L389)
