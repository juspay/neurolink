[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsSTTOptions

# Type Alias: ElevenLabsSTTOptions

> **ElevenLabsSTTOptions** = [`STTOptions`](STTOptions.md) & `object`

## Type Declaration

### model?

> `optional` **model?**: [`ElevenLabsSTTModel`](ElevenLabsSTTModel.md)

Scribe model id. Default `scribe_v2`.

### tagAudioEvents?

> `optional` **tagAudioEvents?**: `boolean`

Annotate non-speech audio events ("(laughter)", "(music)") in the
transcript. ElevenLabs defaults this to true; NeuroLink sends `false` so
the transcript reads as plain speech unless asked otherwise.

#### Default

```ts
false;
```

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-request timeout in milliseconds. Default 60_000.

### baseUrl?

> `optional` **baseUrl?**: `string`

API base URL including the `/v1` prefix. Default
`ELEVENLABS_BASE_URL` or `https://api.elevenlabs.io/v1`.
