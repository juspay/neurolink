[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamChunk

# Type Alias: StreamChunk

> **StreamChunk** = \{ `type`: `"text"`; `content`: `string`; \} \| \{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \}

Defined in: [types/stream.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/stream.ts#L196)

Stream chunk type using discriminated union for type safety

Used in streaming responses to deliver either text or TTS audio chunks.
The discriminated union ensures type safety - only one variant can exist at a time.

## Union Members

### Type Literal

\{ `type`: `"text"`; `content`: `string`; \}

#### type

> **type**: `"text"`

Discriminator for text chunks

#### content

> **content**: `string`

Text content chunk

---

### Type Literal

\{ `type`: `"tts_audio"`; `audio`: [`TTSChunk`](TTSChunk.md); \}

#### type

> **type**: `"tts_audio"`

Discriminator for synthesized TTS audio chunks. Uses `tts_audio`
(not `audio`) to avoid colliding with realtime AudioChunk and to
match the runtime shape emitted by `BaseProvider.stream()`.

#### audio

> **audio**: [`TTSChunk`](TTSChunk.md)

TTS audio chunk data

## Examples

```typescript
for await (const chunk of result.stream) {
  if (chunk.type === "text") {
    console.log(chunk.content); // TypeScript knows 'content' exists
  }
}
```

```typescript
const audioBuffer: Buffer[] = [];
for await (const chunk of result.stream) {
  if (chunk.type === "tts_audio") {
    audioBuffer.push(chunk.audio.data); // TypeScript knows 'audio' exists
    if (chunk.audio.isFinal) {
      const fullAudio = Buffer.concat(audioBuffer);
      fs.writeFileSync("output.mp3", fullAudio);
    }
  }
}
```

```typescript
for await (const chunk of result.stream) {
  switch (chunk.type) {
    case "text":
      process.stdout.write(chunk.content);
      break;
    case "tts_audio":
      playAudioChunk(chunk.audio.data);
      break;
  }
}
```
