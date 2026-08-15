[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / normalizePhrases

# Function: normalizePhrases()

> **normalizePhrases**(`phrases`): `string`[]

Defined in: [knowledge/normalize.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/knowledge/normalize.ts#L71)

Normalize each candidate phrase and drop blanks/duplicates while preserving
first-seen order. Used to build the exact-key and alias key sets.

## Parameters

### phrases

`string`[]

## Returns

`string`[]
