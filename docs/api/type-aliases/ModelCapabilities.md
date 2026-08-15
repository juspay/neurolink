[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelCapabilities

# Type Alias: ModelCapabilities

> **ModelCapabilities** = `object`

Defined in: [types/model.ts:116](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L116)

Model capabilities interface

## Properties

### vision

> **vision**: `boolean`

Defined in: [types/model.ts:117](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L117)

---

### functionCalling

> **functionCalling**: `boolean`

Defined in: [types/model.ts:118](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L118)

---

### codeGeneration

> **codeGeneration**: `boolean`

Defined in: [types/model.ts:119](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L119)

---

### reasoning

> **reasoning**: `boolean`

Defined in: [types/model.ts:120](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L120)

---

### multimodal

> **multimodal**: `boolean`

Defined in: [types/model.ts:121](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L121)

---

### streaming

> **streaming**: `boolean`

Defined in: [types/model.ts:122](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L122)

---

### jsonMode

> **jsonMode**: `boolean`

Defined in: [types/model.ts:123](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L123)

---

### samplingParams?

> `optional` **samplingParams?**: `boolean`

Defined in: [types/model.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/model.ts#L131)

Whether the model accepts classic sampling parameters
(`temperature` / `topP`). Reasoning-effort models (Claude Sonnet 5,
Opus 4.7+, Fable 5 families) reject them. Optional: unset means
supported, and `modelSupportsSamplingParams` falls back to the known
family patterns.
