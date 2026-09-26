[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HeyGenAvatar

# Class: HeyGenAvatar

HeyGen Avatar Handler.

Auth: `X-API-Key: ${HEYGEN_API_KEY}`. The HeyGen API expects an
`avatar_id` (HeyGen's own avatar catalog) — pass it via `options.voice`
for legacy callers, or `options.avatarId` for explicit users.

## Implements

- [`AvatarHandler`](../type-aliases/AvatarHandler.md)

## Constructors

### Constructor

> **new HeyGenAvatar**(`apiKey?`): `HeyGenAvatar`

#### Parameters

##### apiKey?

`string`

#### Returns

`HeyGenAvatar`

## Properties

### maxAudioDurationSeconds

> `readonly` **maxAudioDurationSeconds**: `300` = `300`

Maximum supported audio length in seconds (provider-specific).

#### Implementation of

`AvatarHandler.maxAudioDurationSeconds`

---

### supportedFormats

> `readonly` **supportedFormats**: readonly [`AvatarVideoFormat`](../type-aliases/AvatarVideoFormat.md)[]

Output formats supported by this handler.

#### Implementation of

`AvatarHandler.supportedFormats`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`AvatarHandler.isConfigured`

---

### generate()

> **generate**(`options`): `Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

Generate a talking-head video from an image + audio (or pre-rendered text).

#### Parameters

##### options

[`AvatarOptions`](../type-aliases/AvatarOptions.md)

#### Returns

`Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

#### Implementation of

`AvatarHandler.generate`
