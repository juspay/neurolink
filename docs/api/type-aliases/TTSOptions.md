[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSOptions

# Type Alias: TTSOptions

> **TTSOptions** = `object`

Defined in: [types/tts.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L37)

TTS configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/tts.ts:39](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L39)

Enable TTS output

---

### useAiResponse?

> `optional` **useAiResponse?**: `boolean`

Defined in: [types/tts.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L68)

Use the AI-generated response for TTS instead of the input text

When false or undefined (default): TTS will synthesize the input text/prompt directly without calling AI generation
When true: TTS will synthesize the AI-generated response after generation completes

#### Default

```ts
false;
```

#### Examples

```typescript
const result = await neurolink.generate({
  input: { text: "Hello world" },
  provider: "google-ai",
  tts: { enabled: true }, // or useAiResponse: false
});
// TTS synthesizes "Hello world" directly, no AI generation
```

```typescript
const result = await neurolink.generate({
  input: { text: "Tell me a joke" },
  provider: "google-ai",
  tts: { enabled: true, useAiResponse: true },
});
// AI generates the joke, then TTS synthesizes the AI's response
```

---

### voice?

> `optional` **voice?**: `string`

Defined in: [types/tts.ts:70](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L70)

Voice identifier (e.g., "en-US-Neural2-C")

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:72](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L72)

Audio format (default: mp3)

---

### speed?

> `optional` **speed?**: `number`

Defined in: [types/tts.ts:74](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L74)

Speaking rate 0.25-4.0 (default: 1.0)

---

### pitch?

> `optional` **pitch?**: `number`

Defined in: [types/tts.ts:76](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L76)

Voice pitch adjustment -20.0 to 20.0 semitones (default: 0.0)

---

### volumeGainDb?

> `optional` **volumeGainDb?**: `number`

Defined in: [types/tts.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L78)

Volume gain in dB -96.0 to 16.0 (default: 0.0)

---

### quality?

> `optional` **quality?**: [`TTSQuality`](TTSQuality.md)

Defined in: [types/tts.ts:80](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L80)

Audio quality (default: standard)

---

### output?

> `optional` **output?**: `string`

Defined in: [types/tts.ts:82](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L82)

Output file path (optional)

---

### play?

> `optional` **play?**: `boolean`

Defined in: [types/tts.ts:84](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L84)

Auto-play audio after generation (default: false)

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/tts.ts:86](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/tts.ts#L86)

Override TTS provider (e.g., "elevenlabs", "openai-tts", "azure-tts")
