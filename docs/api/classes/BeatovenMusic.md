[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BeatovenMusic

# Class: BeatovenMusic

Defined in: [music/providers/BeatovenMusic.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L37)

Beatoven.ai Music Generation Handler.

Beatoven is a royalty-free music generation API tuned for
background / cinematic / brand music. Tracks are composed
asynchronously: submit a prompt, poll the task, then download.

## Implements

- [`MusicHandler`](../type-aliases/MusicHandler.md)

## Constructors

### Constructor

> **new BeatovenMusic**(`apiKey?`): `BeatovenMusic`

Defined in: [music/providers/BeatovenMusic.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L58)

#### Parameters

##### apiKey?

`string`

#### Returns

`BeatovenMusic`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `300` = `300`

Defined in: [music/providers/BeatovenMusic.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L38)

Maximum supported track duration in seconds (provider-specific).

#### Implementation of

`MusicHandler.maxDurationSeconds`

---

### supportedFormats

> `readonly` **supportedFormats**: readonly [`MusicAudioFormat`](../type-aliases/MusicAudioFormat.md)[]

Defined in: [music/providers/BeatovenMusic.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L39)

Output formats supported by this handler.

#### Implementation of

`MusicHandler.supportedFormats`

---

### supportedGenres

> `readonly` **supportedGenres**: readonly `string`[]

Defined in: [music/providers/BeatovenMusic.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L43)

Genres / styles the upstream advertises (informational).

#### Implementation of

`MusicHandler.supportedGenres`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [music/providers/BeatovenMusic.ts:67](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L67)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`MusicHandler.isConfigured`

---

### generate()

> **generate**(`options`): `Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

Defined in: [music/providers/BeatovenMusic.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/music/providers/BeatovenMusic.ts#L71)

Generate a music track from prompt + options.

#### Parameters

##### options

[`MusicOptions`](../type-aliases/MusicOptions.md)

prompt, duration, format, genre, mood, etc.

#### Returns

`Promise`\<[`MusicResult`](../type-aliases/MusicResult.md)\>

#### Implementation of

`MusicHandler.generate`
