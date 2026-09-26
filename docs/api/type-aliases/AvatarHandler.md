[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarHandler

# Type Alias: AvatarHandler

> **AvatarHandler** = `object`

Handler contract for avatar / lip-sync providers.

Implementations enforce their own timeouts. Recommended:

- Per-request fetch timeout: 30 seconds
- Total job-completion timeout: 5 minutes

## Properties

### maxAudioDurationSeconds?

> `readonly` `optional` **maxAudioDurationSeconds?**: `number`

Maximum supported audio length in seconds (provider-specific).

---

### supportedFormats?

> `readonly` `optional` **supportedFormats?**: readonly [`AvatarVideoFormat`](AvatarVideoFormat.md)[]

Output formats supported by this handler.

## Methods

### generate()

> **generate**(`options`): `Promise`\<[`AvatarResult`](AvatarResult.md)\>

Generate a talking-head video from an image + audio (or pre-rendered text).

#### Parameters

##### options

[`AvatarOptions`](AvatarOptions.md)

#### Returns

`Promise`\<[`AvatarResult`](AvatarResult.md)\>

---

### isConfigured()

> **isConfigured**(): `boolean`

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`
