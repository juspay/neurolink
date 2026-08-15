[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsMusic

# Class: ElevenLabsMusic

Defined in: [music/providers/ElevenLabsMusic.ts:34](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L34)

ElevenLabs Music / Sound Generation Handler.

Auth: `xi-api-key: ${ELEVENLABS_API_KEY}` (shares the same env var as
ElevenLabs TTS — same account; different endpoint).

Best for: short sound effects (ambient drones, hits, foley) and short
music loops up to 22 seconds.

## Implements

- [`MusicHandler`](../type-aliases/MusicHandler.md)

## Constructors

### Constructor

> **new ElevenLabsMusic**(`apiKey?`): `ElevenLabsMusic`

Defined in: [music/providers/ElevenLabsMusic.ts:49](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L49)

#### Parameters

##### apiKey?

`string`

#### Returns

`ElevenLabsMusic`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `22` = `22`

Defined in: [music/providers/ElevenLabsMusic.ts:35](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L35)

Maximum supported track duration in seconds (provider-specific).

#### Implementation of

`MusicHandler.maxDurationSeconds`

---

### supportedFormats

> `readonly` **supportedFormats**: readonly [`MusicAudioFormat`](../type-aliases/MusicAudioFormat.md)[]

Defined in: [music/providers/ElevenLabsMusic.ts:36](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L36)

Output formats supported by this handler.

#### Implementation of

`MusicHandler.supportedFormats`

---

### supportedGenres

> `readonly` **supportedGenres**: readonly `string`[]

Defined in: [music/providers/ElevenLabsMusic.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L37)

Genres / styles the upstream advertises (informational).

#### Implementation of

`MusicHandler.supportedGenres`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [music/providers/ElevenLabsMusic.ts:57](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L57)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`MusicHandler.isConfigured`

---

### generate()

> **generate**(`options`): `Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

Defined in: [music/providers/ElevenLabsMusic.ts:61](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/music/providers/ElevenLabsMusic.ts#L61)

Generate a music track from prompt + options.

#### Parameters

##### options

[`MusicOptions`](../type-aliases/MusicOptions.md)

prompt, duration, format, genre, mood, etc.

#### Returns

`Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

#### Implementation of

`MusicHandler.generate`
