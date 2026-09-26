[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BeatovenMusic

# Class: BeatovenMusic

Beatoven.ai Music Generation Handler.

Beatoven is a royalty-free music generation API tuned for
background / cinematic / brand music. Tracks are composed
asynchronously: submit a prompt, poll the task, then download.

## Implements

- [`MusicHandler`](../type-aliases/MusicHandler.md)

## Constructors

### Constructor

> **new BeatovenMusic**(`apiKey?`): `BeatovenMusic`

#### Parameters

##### apiKey?

`string`

#### Returns

`BeatovenMusic`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `300` = `300`

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
