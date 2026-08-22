[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / HeyGenAvatar

# Class: HeyGenAvatar

Defined in: [avatar/providers/HeyGenAvatar.ts:40](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/avatar/providers/HeyGenAvatar.ts#L40)

HeyGen Avatar Handler.

Auth: `X-API-Key: ${HEYGEN_API_KEY}`. The HeyGen API expects an
`avatar_id` (HeyGen's own avatar catalog) — pass it via `options.voice`
for legacy callers, or `options.avatarId` for explicit users.

## Implements

- [`AvatarHandler`](../type-aliases/AvatarHandler.md)

## Constructors

### Constructor

> **new HeyGenAvatar**(`apiKey?`): `HeyGenAvatar`

Defined in: [avatar/providers/HeyGenAvatar.ts:47](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/avatar/providers/HeyGenAvatar.ts#L47)

#### Parameters

##### apiKey?

`string`

#### Returns

`HeyGenAvatar`

## Properties

### maxAudioDurationSeconds

> `readonly` **maxAudioDurationSeconds**: `300` = `300`

Defined in: [avatar/providers/HeyGenAvatar.ts:41](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/avatar/providers/HeyGenAvatar.ts#L41)

Maximum supported audio length in seconds (provider-specific).

#### Implementation of

`AvatarHandler.maxAudioDurationSeconds`

---

### supportedFormats

> `readonly` **supportedFormats**: readonly [`AvatarVideoFormat`](../type-aliases/AvatarVideoFormat.md)[]

Defined in: [avatar/providers/HeyGenAvatar.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/avatar/providers/HeyGenAvatar.ts#L42)

Output formats supported by this handler.

#### Implementation of

`AvatarHandler.supportedFormats`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [avatar/providers/HeyGenAvatar.ts:56](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/avatar/providers/HeyGenAvatar.ts#L56)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`AvatarHandler.isConfigured`

---

### generate()

> **generate**(`options`): `Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

Defined in: [avatar/providers/HeyGenAvatar.ts:60](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/avatar/providers/HeyGenAvatar.ts#L60)

Generate a talking-head video from an image + audio (or pre-rendered text).

#### Parameters

##### options

[`AvatarOptions`](../type-aliases/AvatarOptions.md)

#### Returns

`Promise`\<[`AvatarResult`](../type-aliases/AvatarResult.md)\>

#### Implementation of

`AvatarHandler.generate`
