[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTProviderCapabilities

# Type Alias: STTProviderCapabilities

> **STTProviderCapabilities** = `object`

## Properties

### streaming

> **streaming**: `"native"` \| `"chunked"`

`"native"`: the handler streams itself; `"chunked"`: the adapter streams a batch handler.

---

### diarization

> **diarization**: `boolean`

---

### languageDetect

> **languageDetect**: `boolean`

The engine reports a detected language (and, where it can, a confidence).

---

### prompt

> **prompt**: `boolean`

Accepts a context prompt for biasing.

---

### wordTimestamps

> **wordTimestamps**: `boolean`

---

### local

> **local**: `boolean`

Runs on this machine; needs no key.

---

### languages?

> `optional` **languages?**: readonly `string`[]

Languages the engine supports when it is not open-ended.
