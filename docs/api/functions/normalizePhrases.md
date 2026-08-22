[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / normalizePhrases

# Function: normalizePhrases()

> **normalizePhrases**(`phrases`): `string`[]

Defined in: [knowledge/normalize.ts:71](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/knowledge/normalize.ts#L71)

Normalize each candidate phrase and drop blanks/duplicates while preserving
first-seen order. Used to build the exact-key and alias key sets.

## Parameters

### phrases

`string`[]

## Returns

`string`[]
