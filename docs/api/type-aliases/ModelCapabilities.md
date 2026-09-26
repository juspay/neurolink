[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelCapabilities

# Type Alias: ModelCapabilities

> **ModelCapabilities** = `object`

Model capabilities interface

## Properties

### vision

> **vision**: `boolean`

---

### functionCalling

> **functionCalling**: `boolean`

---

### codeGeneration

> **codeGeneration**: `boolean`

---

### reasoning

> **reasoning**: `boolean`

---

### multimodal

> **multimodal**: `boolean`

---

### streaming

> **streaming**: `boolean`

---

### jsonMode

> **jsonMode**: `boolean`

---

### samplingParams?

> `optional` **samplingParams?**: `boolean`

Whether the model accepts classic sampling parameters
(`temperature` / `topP`). Reasoning-effort models (Claude Sonnet 5,
Opus 4.7+, Fable 5 families) reject them. Optional: unset means
supported, and `modelSupportsSamplingParams` falls back to the known
family patterns.
