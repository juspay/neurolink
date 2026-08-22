[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexVideoHandler

# Class: VertexVideoHandler

Defined in: [adapters/video/vertexVideoHandler.ts:998](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L998)

Class wrapper around the standalone Vertex Veo functions, conforming to
the `VideoHandler` contract so it can register with `VideoProcessor`.

The free functions (`generateVideoWithVertex`, `generateTransitionWithVertex`,
`isVertexVideoConfigured`) are kept exported for backward compatibility —
external callers (Director's `directorPipeline.ts`, test scripts) reference
them directly.

## Implements

- [`VideoHandler`](../type-aliases/VideoHandler.md)

## Constructors

### Constructor

> **new VertexVideoHandler**(): `VertexVideoHandler`

#### Returns

`VertexVideoHandler`

## Properties

### maxDurationSeconds

> `readonly` **maxDurationSeconds**: `8` = `8`

Defined in: [adapters/video/vertexVideoHandler.ts:999](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L999)

Maximum video duration in seconds supported by this provider.

#### Implementation of

`VideoHandler.maxDurationSeconds`

---

### supportedAspectRatios

> `readonly` **supportedAspectRatios**: readonly (`"9:16"` \| `"16:9"`)[]

Defined in: [adapters/video/vertexVideoHandler.ts:1000](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1000)

Supported aspect ratios.

#### Implementation of

`VideoHandler.supportedAspectRatios`

---

### supportedResolutions

> `readonly` **supportedResolutions**: readonly (`"720p"` \| `"1080p"`)[]

Defined in: [adapters/video/vertexVideoHandler.ts:1004](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1004)

Supported output resolutions.

#### Implementation of

`VideoHandler.supportedResolutions`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/video/vertexVideoHandler.ts:1009](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1009)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`VideoHandler.isConfigured`

---

### generate()

> **generate**(`image`, `prompt`, `options`, `region?`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Defined in: [adapters/video/vertexVideoHandler.ts:1013](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1013)

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

##### region?

`string`

Provider-specific region override (e.g. Vertex location)

#### Returns

`Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Buffer + metadata

#### Implementation of

`VideoHandler.generate`

---

### generateTransition()

> **generateTransition**(`firstFrame`, `lastFrame`, `prompt`, `options?`, `region?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [adapters/video/vertexVideoHandler.ts:1022](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1022)

Optional — generate a transition clip between two frames (Director Mode).

Providers without first-and-last-frame interpolation omit this method;
`VideoProcessor.generateTransition` will surface a typed error.

`durationSeconds` is on `VideoTransitionOptions` (default 4).

#### Parameters

##### firstFrame

`Buffer`

##### lastFrame

`Buffer`

##### prompt

`string`

##### options?

[`VideoTransitionOptions`](../type-aliases/VideoTransitionOptions.md)

##### region?

`string`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

#### Implementation of

`VideoHandler.generateTransition`
