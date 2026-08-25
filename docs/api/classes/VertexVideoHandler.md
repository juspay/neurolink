[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VertexVideoHandler

# Class: VertexVideoHandler

Defined in: [adapters/video/vertexVideoHandler.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1085)

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

Defined in: [adapters/video/vertexVideoHandler.ts:1086](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1086)

Maximum video duration in seconds supported by this provider.

#### Implementation of

`VideoHandler.maxDurationSeconds`

---

### supportedAspectRatios

> `readonly` **supportedAspectRatios**: readonly (`"9:16"` \| `"16:9"`)[]

Defined in: [adapters/video/vertexVideoHandler.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1087)

Supported aspect ratios.

#### Implementation of

`VideoHandler.supportedAspectRatios`

---

### supportedResolutions

> `readonly` **supportedResolutions**: readonly (`"720p"` \| `"1080p"`)[]

Defined in: [adapters/video/vertexVideoHandler.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1091)

Supported output resolutions.

#### Implementation of

`VideoHandler.supportedResolutions`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [adapters/video/vertexVideoHandler.ts:1096](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1096)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`

#### Implementation of

`VideoHandler.isConfigured`

---

### generate()

> **generate**(`image`, `prompt`, `options`, `region?`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Defined in: [adapters/video/vertexVideoHandler.ts:1100](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1100)

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

Defined in: [adapters/video/vertexVideoHandler.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/adapters/video/vertexVideoHandler.ts#L1109)

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
