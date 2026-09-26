[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSOptions

# Type Alias: TTSOptions

> **TTSOptions** = `object`

TTS configuration options

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable TTS output

---

### useAiResponse?

> `optional` **useAiResponse?**: `boolean`

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

Voice identifier (e.g., "en-US-Neural2-C")

---

### format?

> `optional` **format?**: [`TTSAudioFormat`](TTSAudioFormat.md)

Audio format (default: mp3)

---

### speed?

> `optional` **speed?**: `number`

Speaking rate 0.25-4.0 (default: 1.0)

---

### pitch?

> `optional` **pitch?**: `number`

Voice pitch adjustment -20.0 to 20.0 semitones (default: 0.0)

---

### volumeGainDb?

> `optional` **volumeGainDb?**: `number`

Volume gain in dB -96.0 to 16.0 (default: 0.0)

---

### quality?

> `optional` **quality?**: [`TTSQuality`](TTSQuality.md)

Audio quality (default: standard)

---

### output?

> `optional` **output?**: `string`

Output file path (optional)

---

### play?

> `optional` **play?**: `boolean`

Auto-play audio after generation (default: false)

---

### provider?

> `optional` **provider?**: [`TTSProviderName`](TTSProviderName.md)

Override TTS provider (e.g., "elevenlabs", "openai-tts", "azure-tts")

---

### streamingBufferSize?

> `optional` **streamingBufferSize?**: `number`

Minimum buffered text length before incremental stream synthesis flushes
at a sentence boundary. The provider's maximum text length remains a hard
upper bound. Defaults to 120 characters.
