[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / KlingVideoHandler

# Class: KlingVideoHandler

Kling Video Handler.

Auth: `Authorization: Bearer ${KLING_API_KEY}` (PiAPI / Kling key).
Models: kling-1.6-i2v (default), kling-1.5-i2v, kling-1.0.

## Implements

- [`VideoHandler`](../type-aliases/VideoHandler.md)

## Constructors

### Constructor

> **new KlingVideoHandler**(`apiKey?`): `KlingVideoHandler`

#### Parameters

##### apiKey?

`string`

#### Returns

`KlingVideoHandler`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `10` = `10`

Maximum video duration in seconds supported by this provider.

#### Implementation of

`VideoHandler.maxDurationSeconds`

---

### supportedAspectRatios

> `readonly` **supportedAspectRatios**: readonly (`"9:16"` \| `"16:9"` \| `"1:1"`)[]

Supported aspect ratios.

#### Implementation of

`VideoHandler.supportedAspectRatios`

---

### supportedResolutions

> `readonly` **supportedResolutions**: readonly (`"720p"` \| `"1080p"`)[]

Supported output resolutions.

#### Implementation of

`VideoHandler.supportedResolutions`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`VideoHandler.isConfigured`

---

### generate()

> **generate**(`image`, `prompt`, `options`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

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
