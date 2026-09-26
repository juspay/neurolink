[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElevenLabsMusic

# Class: ElevenLabsMusic

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

#### Parameters

##### apiKey?

`string`

#### Returns

`ElevenLabsMusic`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `22` = `22`

Maximum supported track duration in seconds (provider-specific).

#### Implementation of

`MusicHandler.maxDurationSeconds`

---

### supportedFormats

> `readonly` **supportedFormats**: readonly [`MusicAudioFormat`](../type-aliases/MusicAudioFormat.md)[]

Output formats supported by this handler.

#### Implementation of

`MusicHandler.supportedFormats`

---

### supportedGenres

> `readonly` **supportedGenres**: readonly `string`[]

Genres / styles the upstream advertises (informational).

#### Implementation of

`MusicHandler.supportedGenres`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`MusicHandler.isConfigured`

---

### generate()

> **generate**(`options`): `Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

Generate a music track from prompt + options.

#### Parameters

##### options

[`MusicOptions`](../type-aliases/MusicOptions.md)

prompt, duration, format, genre, mood, etc.

#### Returns

`Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

#### Implementation of

`MusicHandler.generate`
