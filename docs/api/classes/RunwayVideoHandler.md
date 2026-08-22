[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RunwayVideoHandler

# Class: RunwayVideoHandler

Defined in: [adapters/video/runwayVideoHandler.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L35)

Runway Video Handler.

Auth: `Authorization: Bearer ${RUNWAY_API_KEY}` + `X-Runway-Version`
header. Models: gen3a_turbo (Gen-3 Alpha Turbo, default), gen4_turbo.

## Implements

- [`VideoHandler`](../type-aliases/VideoHandler.md)

## Constructors

### Constructor

> **new RunwayVideoHandler**(`apiKey?`): `RunwayVideoHandler`

Defined in: [adapters/video/runwayVideoHandler.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L50)

#### Parameters

##### apiKey?

`string`

#### Returns

`RunwayVideoHandler`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `10` = `10`

Defined in: [adapters/video/runwayVideoHandler.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L36)

Maximum video duration in seconds supported by this provider.

#### Implementation of

`VideoHandler.maxDurationSeconds`

---

### supportedAspectRatios

> `readonly` **supportedAspectRatios**: readonly (`"9:16"` \| `"16:9"`)[]

Defined in: [adapters/video/runwayVideoHandler.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L37)

Supported aspect ratios.

#### Implementation of

`VideoHandler.supportedAspectRatios`

---

### supportedResolutions

> `readonly` **supportedResolutions**: readonly (`"720p"` \| `"1080p"`)[]

Defined in: [adapters/video/runwayVideoHandler.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L41)

Supported output resolutions.

#### Implementation of

`VideoHandler.supportedResolutions`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/video/runwayVideoHandler.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L60)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`VideoHandler.isConfigured`

---

### generate()

> **generate**(`image`, `prompt`, `options`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Defined in: [adapters/video/runwayVideoHandler.ts:64](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/runwayVideoHandler.ts#L64)

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
