[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTEngineInfo

# Type Alias: STTEngineInfo

> **STTEngineInfo** = `object`

Which engines produced the result.

## Properties

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### fallbackUsed?

> `optional` **fallbackUsed?**: `boolean`

The fallback engine took the whole request (or an utterance, when streaming).

---

### secondOpinion?

> `optional` **secondOpinion?**: `string`

The second-opinion engine that was reconciled into the text.
