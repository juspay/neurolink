[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RequestKindTTSInput

# Type Alias: RequestKindTTSInput

> **RequestKindTTSInput** = `object`

The two `tts` fields that decide between direct synthesis and synthesizing
the model's reply. `mode` wins; `useAiResponse` is the legacy spelling.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### mode?

> `optional` **mode?**: [`TTSSynthesisMode`](TTSSynthesisMode.md)

---

### useAiResponse?

> `optional` **useAiResponse?**: `boolean`
