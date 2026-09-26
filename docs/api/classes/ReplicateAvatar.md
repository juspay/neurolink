[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicateAvatar

# Class: ReplicateAvatar

Replicate Avatar Handler.

MuseTalk requires both `image` and `audio` inputs — `text`-only is not
supported here (use D-ID for that, or chain TTS + this handler).

## Implements

- [`AvatarHandler`](../type-aliases/AvatarHandler.md)

## Constructors

### Constructor

> **new ReplicateAvatar**(): `ReplicateAvatar`

#### Returns

`ReplicateAvatar`

## Properties

### maxAudioDurationSeconds

> `readonly` **maxAudioDurationSeconds**: `60` = `60`

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
