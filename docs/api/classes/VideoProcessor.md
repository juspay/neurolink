[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProcessor

# Class: VideoProcessor

Defined in: [utils/videoProcessor.ts:45](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L45)

Static processor managing the video handler registry.

Handlers register themselves during `ProviderRegistry._doRegister()`
via `VideoProcessor.registerHandler(name, instance)`. Lookups are
O(1) on a normalised lower-case provider key.

## Constructors

### Constructor

> **new VideoProcessor**(): `VideoProcessor`

#### Returns

`VideoProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Defined in: [utils/videoProcessor.ts:53](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L53)

Register a video handler for a specific provider.

#### Parameters

##### providerName

`string`

##### handler

[`VideoHandler`](../type-aliases/VideoHandler.md)

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [utils/videoProcessor.ts:62](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L62)

Check if a provider has a registered video handler.

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### listProviders()

> `static` **listProviders**(): `string`[]

Defined in: [utils/videoProcessor.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L69)

List the names of all registered providers.

#### Returns

`string`[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Defined in: [utils/videoProcessor.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L80)

Clear all registered handlers (for testing).

#### Returns

`void`

---

### generate()

> `static` **generate**(`provider`, `image`, `prompt`, `options`, `region?`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Defined in: [utils/videoProcessor.ts:109](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L109)

Generate a single video clip via the registered handler.

#### Parameters

##### provider

`string`

Registered provider name (e.g. "vertex", "kling")

##### image

`Buffer`

Source image buffer

##### prompt

`string`

Text prompt describing the desired motion / content

##### options

[`VideoOutputOptions`](../type-aliases/VideoOutputOptions.md)

Resolution / length / aspect-ratio / audio options

##### region?

`string`

Optional region override (Vertex location, etc.)

#### Returns

`Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

#### Throws

VideoError on registry miss, handler-not-configured, or
generation failure

---

### generateTransition()

> `static` **generateTransition**(`provider`, `firstFrame`, `lastFrame`, `prompt`, `options?`, `region?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

Defined in: [utils/videoProcessor.ts:190](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/videoProcessor.ts#L190)

Generate a transition clip via the registered handler (Director Mode).

Providers without first-and-last-frame interpolation surface a typed
`TRANSITION_NOT_SUPPORTED` error here; callers should fall back to
generating a regular clip with a transition prompt.

#### Parameters

##### provider

`string`

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
