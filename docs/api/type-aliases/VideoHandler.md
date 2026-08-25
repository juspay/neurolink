[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoHandler

# Type Alias: VideoHandler

> **VideoHandler** = `object`

Defined in: [types/video.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L71)

Handler contract for video generation providers.

Every concrete handler (`VertexVideoHandler`, `KlingVideoHandler`,
`RunwayVideoHandler`, `ReplicateVideoHandler`, …) implements this
interface and registers itself with `VideoProcessor.registerHandler`.

Implementations MUST enforce their own timeouts. The recommended
total-deadline for image-to-video predictLongRunning APIs is
3-5 minutes; the per-request fetch timeout is 30 seconds.

## Properties

### maxDurationSeconds?

> `readonly` `optional` **maxDurationSeconds?**: `number`

Defined in: [types/video.ts:108](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L108)

Maximum video duration in seconds supported by this provider.

---

### supportedAspectRatios?

> `readonly` `optional` **supportedAspectRatios?**: readonly (`"9:16"` \| `"16:9"` \| `"1:1"` \| `"4:3"` \| `"3:4"`)[]

Defined in: [types/video.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L111)

Supported aspect ratios.

---

### supportedResolutions?

> `readonly` `optional` **supportedResolutions?**: readonly (`"480p"` \| `"720p"` \| `"1080p"` \| `"4k"`)[]

Defined in: [types/video.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L120)

Supported output resolutions.

## Methods

### generate()

> **generate**(`image`, `prompt`, `options`, `region?`): `Promise`\<[`VideoGenerationResult`](VideoGenerationResult.md)\>

Defined in: [types/video.ts:81](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L81)

Generate a single video clip from an input image and prompt.

#### Parameters

##### image

`Buffer`

Input image buffer (JPEG, PNG, or WebP)

##### prompt

`string`

Text prompt describing desired video motion / content

##### options

[`VideoOutputOptions`](VideoOutputOptions.md)

Resolution, length, aspect ratio, audio settings

##### region?

`string`

Provider-specific region override (e.g. Vertex location)

#### Returns

`Promise`\<[`VideoGenerationResult`](VideoGenerationResult.md)\>

Buffer + metadata

---

### generateTransition()?

> `optional` **generateTransition**(`firstFrame`, `lastFrame`, `prompt`, `options?`, `region?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [types/video.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L96)

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

[`VideoTransitionOptions`](VideoTransitionOptions.md)

##### region?

`string`

#### Returns

`Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/video.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/video.ts#L105)

Validate the provider is configured (auth, base URL, etc.).

#### Returns

`boolean`
