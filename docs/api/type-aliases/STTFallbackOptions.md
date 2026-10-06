[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTFallbackOptions

# Type Alias: STTFallbackOptions

> **STTFallbackOptions** = `object`

Where an utterance goes when the primary engine cannot read it. `when`
defaults to `["unsure", "empty"]`: a low language-detection score, or no
text at all.

## Properties

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### when?

> `optional` **when?**: (`"unsure"` \| `"empty"` \| `"error"`)[]
