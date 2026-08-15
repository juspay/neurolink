[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / DIDAvatar

# Class: DIDAvatar

Defined in: [avatar/providers/DIDAvatar.ts:47](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/avatar/providers/DIDAvatar.ts#L47)

D-ID Avatar Handler.

Auth: `Authorization: Basic ${DID_API_KEY}` (the API key is
already a base64-encoded `username:password` from the D-ID console).

Env vars: `DID_API_KEY` (preferred) / `D_ID_API_KEY` (legacy alias).

## Implements

- [`AvatarHandler`](../type-aliases/AvatarHandler.md)

## Constructors

### Constructor

> **new DIDAvatar**(`apiKey?`): `DIDAvatar`

Defined in: [avatar/providers/DIDAvatar.ts:54](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/avatar/providers/DIDAvatar.ts#L54)

#### Parameters

##### apiKey?

`string`

#### Returns

`DIDAvatar`

## Properties

### maxAudioDurationSeconds

> `readonly` **maxAudioDurationSeconds**: `60` = `60`

Defined in: [avatar/providers/DIDAvatar.ts:48](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/avatar/providers/DIDAvatar.ts#L48)

Maximum supported audio length in seconds (provider-specific).

#### Implementation of

`AvatarHandler.maxAudioDurationSeconds`

---

### supportedFormats

> `readonly` **supportedFormats**: readonly [`AvatarVideoFormat`](../type-aliases/AvatarVideoFormat.md)[]

Defined in: [avatar/providers/DIDAvatar.ts:49](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/avatar/providers/DIDAvatar.ts#L49)

Output formats supported by this handler.

#### Implementation of

`AvatarHandler.supportedFormats`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [avatar/providers/DIDAvatar.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/avatar/providers/DIDAvatar.ts#L69)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`AvatarHandler.isConfigured`

---

### generate()

> **generate**(`options`): `Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

Defined in: [avatar/providers/DIDAvatar.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/avatar/providers/DIDAvatar.ts#L73)

Generate a talking-head video from an image + audio (or pre-rendered text).

#### Parameters

##### options

[`AvatarOptions`](../type-aliases/AvatarOptions.md)

#### Returns

`Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

#### Implementation of

`AvatarHandler.generate`
