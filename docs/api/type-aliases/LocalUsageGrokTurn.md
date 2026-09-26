[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGrokTurn

# Type Alias: LocalUsageGrokTurn

> **LocalUsageGrokTurn** = `object`

One Grok Build completed turn after validation: every count a finite,
non-negative safe integer, and the `modelUsage` keys collected. `turns` is
the ledger's `numTurns`, which decides whether the next record continues
this process run or starts a fresh one — see `grokReader.ts`.

## Properties

### input

> **input**: `number`

---

### output

> **output**: `number`

---

### cacheRead

> **cacheRead**: `number`

---

### cacheCreation

> **cacheCreation**: `number`

---

### calls

> **calls**: `number`

---

### turns

> **turns**: `number`

---

### models

> **models**: `string`[]
