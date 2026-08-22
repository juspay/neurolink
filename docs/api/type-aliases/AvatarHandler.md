[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AvatarHandler

# Type Alias: AvatarHandler

> **AvatarHandler** = `object`

Defined in: [types/avatar.ts:120](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L120)

Handler contract for avatar / lip-sync providers.

Implementations enforce their own timeouts. Recommended:

- Per-request fetch timeout: 30 seconds
- Total job-completion timeout: 5 minutes

## Properties

### maxAudioDurationSeconds?

> `readonly` `optional` **maxAudioDurationSeconds?**: `number`

Defined in: [types/avatar.ts:130](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L130)

Maximum supported audio length in seconds (provider-specific).

---

### supportedFormats?

> `readonly` `optional` **supportedFormats?**: readonly [`AvatarVideoFormat`](AvatarVideoFormat.md)[]

Defined in: [types/avatar.ts:133](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L133)

Output formats supported by this handler.

## Methods

### generate()

> **generate**(`options`): `Promise`\<[`AvatarResult`](AvatarResult.md)\>

Defined in: [types/avatar.ts:124](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L124)

Generate a talking-head video from an image + audio (or pre-rendered text).

#### Parameters

##### options

[`AvatarOptions`](AvatarOptions.md)

#### Returns

`Promise`\<[`AvatarResult`](AvatarResult.md)\>

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/avatar.ts:127](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/avatar.ts#L127)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`
