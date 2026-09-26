[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DIDAvatar

# Class: DIDAvatar

D-ID Avatar Handler.

Auth: `Authorization: Basic ${DID_API_KEY}` (the API key is
already a base64-encoded `username:password` from the D-ID console).

Env vars: `DID_API_KEY` (preferred) / `D_ID_API_KEY` (legacy alias).

## Implements

- [`AvatarHandler`](../type-aliases/AvatarHandler.md)

## Constructors

### Constructor

> **new DIDAvatar**(`apiKey?`): `DIDAvatar`

#### Parameters

##### apiKey?

`string`

#### Returns

`DIDAvatar`

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
