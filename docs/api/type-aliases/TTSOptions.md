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

Defined in: [types/tts.ts:89](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L89)

Use the AI-generated response for TTS instead of the input text

This switch applies to non-streaming generation. `stream()` always
synthesizes the streamed AI response incrementally when TTS is enabled.

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

Defined in: [types/tts.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L91)

Voice identifier (e.g., "en-US-Neural2-C")

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Defined in: [types/tts.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L93)

Audio format (default: mp3)

---

### speed?

> `optional` **speed?**: `number`

Defined in: [types/tts.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L95)

Speaking rate 0.25-4.0 (default: 1.0)

---

### pitch?

> `optional` **pitch?**: `number`

Defined in: [types/tts.ts:97](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L97)

Voice pitch adjustment -20.0 to 20.0 semitones (default: 0.0)

---

### volumeGainDb?

> `optional` **volumeGainDb?**: `number`

Defined in: [types/tts.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L99)

Volume gain in dB -96.0 to 16.0 (default: 0.0)

---

### quality?

> `optional` **quality?**: [`TTSQuality`](TTSQuality.md)

Defined in: [types/tts.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L101)

Audio quality (default: standard)

---

### output?

> `optional` **output?**: `string`

Defined in: [types/tts.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L103)

Output file path (optional)

---

### play?

> `optional` **play?**: `boolean`

Defined in: [types/tts.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L105)

Auto-play audio after generation (default: false)

---

### provider?

> `optional` **provider?**: [`TTSProviderName`](TTSProviderName.md)

Defined in: [types/tts.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L107)

Override TTS provider (e.g., "elevenlabs", "openai-tts", "azure-tts")

---

### streamingBufferSize?

> `optional` **streamingBufferSize?**: `number`

Defined in: [types/tts.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/tts.ts#L113)

Minimum buffered text length before incremental stream synthesis flushes
at a sentence boundary. The provider's maximum text length remains a hard
upper bound. Defaults to 120 characters.
