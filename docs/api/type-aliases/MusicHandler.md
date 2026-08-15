[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MusicHandler

# Type Alias: MusicHandler

> **MusicHandler** = `object`

Defined in: [types/music.ts:127](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L127)

Handler contract for music-generation providers.

Implementations enforce their own timeouts. Recommended:

- Per-request fetch timeout: 30 seconds
- Total job-completion timeout: 5 minutes

## Properties

### maxDurationSeconds?

> `readonly` `optional` **maxDurationSeconds?**: `number`

Defined in: [types/music.ts:141](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L141)

Maximum supported track duration in seconds (provider-specific).

---

### supportedFormats?

> `readonly` `optional` **supportedFormats?**: readonly [`MusicAudioFormat`](MusicAudioFormat.md)[]

Defined in: [types/music.ts:144](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L144)

Output formats supported by this handler.

---

### supportedGenres?

> `readonly` `optional` **supportedGenres?**: readonly `string`[]

Defined in: [types/music.ts:147](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L147)

Genres / styles the upstream advertises (informational).

## Methods

### generate()

> **generate**(`options`): `Promise`\<[`MusicResult`](MusicResult.md)\>

Defined in: [types/music.ts:133](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L133)

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

Defined in: [types/music.ts:138](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/music.ts#L138)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`
