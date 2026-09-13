[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeThinkingConfig

# Type Alias: NativeThinkingConfig

> **NativeThinkingConfig** = `object`

Defined in: [types/config.ts:615](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L615)

Native SDK thinkingConfig structure for Gemini native SDK.

`thinkingLevel` and `thinkingBudget` are mutually exclusive on the wire:
Gemini 3 models accept `thinkingLevel`; Gemini 2.5 (and earlier) models
reject it outright with INVALID_ARGUMENT "thinking_level not supported by
this model" and require the numeric `thinkingBudget` instead. Both fields
are optional here so a single type can represent either shape — callers
building the request pick whichever field the target model accepts.

## Properties

### includeThoughts

> **includeThoughts**: `boolean`

Defined in: [types/config.ts:616](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L616)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L617)

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L618)
