[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / KlingVideoHandler

# Class: KlingVideoHandler

Defined in: [adapters/video/klingVideoHandler.ts:42](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L42)

Kling Video Handler.

Auth: `Authorization: Bearer ${KLING_API_KEY}` (PiAPI / Kling key).
Models: kling-1.6-i2v (default), kling-1.5-i2v, kling-1.0.

## Implements

- [`VideoHandler`](../type-aliases/VideoHandler.md)

## Constructors

### Constructor

> **new KlingVideoHandler**(`apiKey?`): `KlingVideoHandler`

Defined in: [adapters/video/klingVideoHandler.ts:54](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L54)

#### Parameters

##### apiKey?

`string`

#### Returns

`KlingVideoHandler`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `10` = `10`

Defined in: [adapters/video/klingVideoHandler.ts:43](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L43)

Maximum video duration in seconds supported by this provider.

#### Implementation of

`VideoHandler.maxDurationSeconds`

---

### supportedAspectRatios

> `readonly` **supportedAspectRatios**: readonly (`"9:16"` \| `"16:9"` \| `"1:1"`)[]

Defined in: [adapters/video/klingVideoHandler.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L44)

Supported aspect ratios.

#### Implementation of

`VideoHandler.supportedAspectRatios`

---

### supportedResolutions

> `readonly` **supportedResolutions**: readonly (`"720p"` \| `"1080p"`)[]

Defined in: [adapters/video/klingVideoHandler.ts:46](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L46)

Supported output resolutions.

#### Implementation of

`VideoHandler.supportedResolutions`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/video/klingVideoHandler.ts:63](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L63)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`VideoHandler.isConfigured`

---

### generate()

> **generate**(`image`, `prompt`, `options`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Defined in: [adapters/video/klingVideoHandler.ts:67](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/adapters/video/klingVideoHandler.ts#L67)

Generate a single video clip from an input image and prompt.

#### Parameters

##### image

`Buffer`

Input image buffer (JPEG, PNG, or WebP)

##### prompt

`string`

Text prompt describing desired video motion / content

##### options

[`VideoOutputOptions`](../type-aliases/VideoOutputOptions.md)

Resolution, length, aspect ratio, audio settings

#### Returns

`Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Buffer + metadata

#### Implementation of

`VideoHandler.generate`
