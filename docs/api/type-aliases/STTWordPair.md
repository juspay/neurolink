[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTWordPair

# Type Alias: STTWordPair

> **STTWordPair** = `object`

One aligned position of two readings: a word from either side, or both when they line up.

## Properties

### indic?

> `optional` **indic?**: `string`

The Indic engine's word (native script).

---

### latin?

> `optional` **latin?**: `string`

The English-oriented engine's word.

---

### alike

> **alike**: `boolean`

Both present and phonetically alike: the speaker said the same thing in both readings.
