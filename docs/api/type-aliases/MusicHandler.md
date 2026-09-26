[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicHandler

# Type Alias: MusicHandler

> **MusicHandler** = `object`

Handler contract for music-generation providers.

Implementations enforce their own timeouts. Recommended:

- Per-request fetch timeout: 30 seconds
- Total job-completion timeout: 5 minutes

## Properties

### maxDurationSeconds?

> `readonly` `optional` **maxDurationSeconds?**: `number`

Maximum supported track duration in seconds (provider-specific).

---

### supportedFormats?

> `readonly` `optional` **supportedFormats?**: readonly [`MusicAudioFormat`](MusicAudioFormat.md)[]

Output formats supported by this handler.

---

### supportedGenres?

> `readonly` `optional` **supportedGenres?**: readonly `string`[]

Genres / styles the upstream advertises (informational).

## Methods

### generate()

> **generate**(`options`): `Promise`\<[`MusicResult`](MusicResult.md)\>

Generate a music track from prompt + options.

#### Parameters

##### options

[`MusicOptions`](MusicOptions.md)

prompt, duration, format, genre, mood, etc.

#### Returns

`Promise`\<[`MusicResult`](MusicResult.md)\>

---

### isConfigured()

> **isConfigured**(): `boolean`

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`
