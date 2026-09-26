[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeThinkingConfig

# Type Alias: NativeThinkingConfig

> **NativeThinkingConfig** = `object`

Defined in: [types/config.ts:651](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L651)

Native SDK thinkingConfig structure for Gemini native SDK.

`thinkingLevel` and `thinkingBudget` are mutually exclusive on the wire:
Gemini 3 models accept `thinkingLevel`; Gemini 2.5 models reject it outright
with INVALID_ARGUMENT "thinking_level not supported by this model" and
require the numeric `thinkingBudget` instead. Gemini 2.5 is also the only
family `createNativeThinkingConfig` emits a budget for:
`getGemini25ThinkingBudgetRange` has no verified range for anything earlier,
so those models get no `thinkingConfig` at all — and a one-time WARN —
rather than a guessed shape that might itself 400.

Both fields are optional here so a single type can represent either shape —
callers building the request pick whichever field the target model accepts.

## Properties

### includeThoughts

> **includeThoughts**: `boolean`

Defined in: [types/config.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L652)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L653)

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L654)
