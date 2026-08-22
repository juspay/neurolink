[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSOptions

# Type Alias: TTSOptions

> **TTSOptions** = `object`

Defined in: [types/tts.ts:55](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L55)

TTS configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/tts.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L57)

Enable TTS output

---

### useAiResponse?

> `optional` **useAiResponse?**: `boolean`

Defined in: [types/tts.ts:86](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L86)

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

Defined in: [types/tts.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L88)

Voice identifier (e.g., "en-US-Neural2-C")

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:90](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L90)

Audio format (default: mp3)

---

### speed?

> `optional` **speed?**: `number`

Defined in: [types/tts.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L92)

Speaking rate 0.25-4.0 (default: 1.0)

---

### pitch?

> `optional` **pitch?**: `number`

Defined in: [types/tts.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L94)

Voice pitch adjustment -20.0 to 20.0 semitones (default: 0.0)

---

### volumeGainDb?

> `optional` **volumeGainDb?**: `number`

Defined in: [types/tts.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L96)

Volume gain in dB -96.0 to 16.0 (default: 0.0)

---

### quality?

> `optional` **quality?**: [`TTSQuality`](TTSQuality.md)

Defined in: [types/tts.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L98)

Audio quality (default: standard)

---

### output?

> `optional` **output?**: `string`

Defined in: [types/tts.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L100)

Output file path (optional)

---

### play?

> `optional` **play?**: `boolean`

Defined in: [types/tts.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L102)

Auto-play audio after generation (default: false)

---

### provider?

> `optional` **provider?**: [`TTSProviderName`](TTSProviderName.md)

Defined in: [types/tts.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L104)

Override TTS provider (e.g., "elevenlabs", "openai-tts", "azure-tts")
