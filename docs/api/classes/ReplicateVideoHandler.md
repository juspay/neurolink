[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicateVideoHandler

# Class: ReplicateVideoHandler

Defined in: [adapters/video/replicateVideoHandler.ts:37](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L37)

Replicate Video Handler.

Capabilities depend on the specific Replicate model — this handler
advertises conservative bounds (any provider-supported aspect ratio /
resolution; up to 10s typical for Wan-Alpha).

## Implements

- [`VideoHandler`](../type-aliases/VideoHandler.md)

## Constructors

### Constructor

> **new ReplicateVideoHandler**(`credentials?`): `ReplicateVideoHandler`

Defined in: [adapters/video/replicateVideoHandler.ts:50](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L50)

#### Parameters

##### credentials?

###### apiToken?

`string`

###### baseUrl?

`string`

###### apiKey?

`string`

###### baseURL?

`string`

#### Returns

`ReplicateVideoHandler`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `10` = `10`

Defined in: [adapters/video/replicateVideoHandler.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L38)

Maximum video duration in seconds supported by this provider.

#### Implementation of

`VideoHandler.maxDurationSeconds`

---

### supportedAspectRatios

> `readonly` **supportedAspectRatios**: readonly (`"9:16"` \| `"16:9"` \| `"1:1"`)[]

Defined in: [adapters/video/replicateVideoHandler.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L39)

Supported aspect ratios.

#### Implementation of

`VideoHandler.supportedAspectRatios`

---

### supportedResolutions

> `readonly` **supportedResolutions**: readonly (`"720p"` \| `"1080p"`)[]

Defined in: [adapters/video/replicateVideoHandler.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L41)

Supported output resolutions.

#### Implementation of

`VideoHandler.supportedResolutions`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/video/replicateVideoHandler.ts:54](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L54)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`VideoHandler.isConfigured`

---

### generate()

> **generate**(`image`, `prompt`, `options`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Defined in: [adapters/video/replicateVideoHandler.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/replicateVideoHandler.ts#L58)

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
