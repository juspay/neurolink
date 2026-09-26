[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LyriaMusic

# Class: LyriaMusic

Google Lyria 3 Pro Music Handler.

Auth: `Authorization: Bearer ${GOOGLE_API_KEY}` or query-string
`?key=${GOOGLE_API_KEY}` (the latter is more compatible with the
Generative Language endpoints today).

## Implements

- [`MusicHandler`](../type-aliases/MusicHandler.md)

## Constructors

### Constructor

> **new LyriaMusic**(`apiKey?`): `LyriaMusic`

#### Parameters

##### apiKey?

`string`

#### Returns

`LyriaMusic`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `30` = `30`

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
