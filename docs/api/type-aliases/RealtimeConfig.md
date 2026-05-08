[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeConfig

# Type Alias: RealtimeConfig

> **RealtimeConfig** = `object`

Defined in: [types/realtime.ts:34](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L34)

Realtime voice configuration

## Properties

### provider

> **provider**: `"openai-realtime"` \| `"gemini-live"`

Defined in: [types/realtime.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L42)

Provider to use. Must match the handler key registered with
`RealtimeProcessor.registerHandler()` — currently `"openai-realtime"`
(registered in `providerRegistry.ts`) and `"gemini-live"` (registered in
`providerRegistry.ts`). Aliasing is handled at registry/CLI parse time,
not here.

---

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/realtime.ts:44](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L44)

API key

---

### model?

> `optional` **model?**: `string`

Defined in: [types/realtime.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L46)

Model to use

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/realtime.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L48)

Voice for TTS output

---

### inputLanguage?

> `optional` **inputLanguage?**: `string`

Defined in: [types/realtime.ts:50](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L50)

Input language

---

### outputLanguage?

> `optional` **outputLanguage?**: `string`

Defined in: [types/realtime.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L52)

Output language

---

### systemPrompt?

> `optional` **systemPrompt?**: `string`

Defined in: [types/realtime.ts:54](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L54)

System prompt for the AI

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/realtime.ts:56](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L56)

Session timeout in milliseconds

---

### inputFormat?

> `optional` **inputFormat?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/realtime.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L58)

Audio input format

---

### outputFormat?

> `optional` **outputFormat?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/realtime.ts:60](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L60)

Audio output format

---

### inputSampleRate?

> `optional` **inputSampleRate?**: `number`

Defined in: [types/realtime.ts:62](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L62)

Input sample rate

---

### outputSampleRate?

> `optional` **outputSampleRate?**: `number`

Defined in: [types/realtime.ts:64](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L64)

Output sample rate

---

### vadEnabled?

> `optional` **vadEnabled?**: `boolean`

Defined in: [types/realtime.ts:66](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L66)

Enable voice activity detection

---

### vadThreshold?

> `optional` **vadThreshold?**: `number`

Defined in: [types/realtime.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L68)

VAD threshold (0-1)

---

### turnDetection?

> `optional` **turnDetection?**: `"server_vad"` \| `"manual"`

Defined in: [types/realtime.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L70)

Turn detection mode

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/realtime.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L72)

Instructions/system prompt for the session

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/realtime.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L74)

Temperature for AI responses

---

### tools?

> `optional` **tools?**: [`RealtimeTool`](RealtimeTool.md)[]

Defined in: [types/realtime.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/realtime.ts#L76)

Tools/functions available to the model
