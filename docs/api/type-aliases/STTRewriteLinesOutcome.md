[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTRewriteLinesOutcome

# Type Alias: STTRewriteLinesOutcome

> **STTRewriteLinesOutcome** = `object`

What a batched line rewrite did; `lines` has exactly as many entries as the input.

## Properties

### lines

> **lines**: `string`[]

---

### batchesOk

> **batchesOk**: `number`

Batches whose output was used, of all batches sent.

---

### batches

> **batches**: `number`

---

### linesKept

> **linesKept**: `number`

Lines whose rewrite was discarded for dropping words.

---

### ms

> **ms**: `number`
