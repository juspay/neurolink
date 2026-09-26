[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeConfig

# Type Alias: RealtimeConfig

> **RealtimeConfig** = `object`

Realtime voice configuration

## Properties

### provider

> **provider**: `"openai-realtime"` \| `"gemini-live"`

Provider to use. Must match the handler key registered with
`RealtimeProcessor.registerHandler()` — currently `"openai-realtime"`
(registered in `providerRegistry.ts`) and `"gemini-live"` (registered in
`providerRegistry.ts`). Aliasing is handled at registry/CLI parse time,
not here.

---

### apiKey?

> `optional` **apiKey?**: `string`

API key

---

### model?

> `optional` **model?**: `string`

Model to use

---

### voice?

> `optional` **voice?**: `string`

Voice for TTS output

---

### inputLanguage?

> `optional` **inputLanguage?**: `string`

Input language

---

### outputLanguage?

> `optional` **outputLanguage?**: `string`

Output language

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

System prompt for the AI

---

### timeout?

> `optional` **timeout?**: `number`

Session timeout in milliseconds

---

### inputFormat?

> `optional` **inputFormat?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio input format

---

### outputFormat?

> `optional` **outputFormat?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio output format

---

### inputSampleRate?

> `optional` **inputSampleRate?**: `number`

Input sample rate

---

### outputSampleRate?

> `optional` **outputSampleRate?**: `number`

Output sample rate

---

### vadEnabled?

> `optional` **vadEnabled?**: `boolean`

Enable voice activity detection

---

### vadThreshold?

> `optional` **vadThreshold?**: `number`

VAD threshold (0-1)

---

### turnDetection?

> `optional` **turnDetection?**: `"server_vad"` \| `"manual"`

Turn detection mode

---

### instructions?

> `optional` **instructions?**: `string`

Instructions/system prompt for the session

---

### temperature?

> `optional` **temperature?**: `number`

Temperature for AI responses

---

### tools?

> `optional` **tools?**: [`RealtimeTool`](RealtimeTool.md)[]

Tools/functions available to the model
