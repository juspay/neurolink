[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / VideoProcessor

# Class: VideoProcessor

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

Check if a provider has a registered video handler.

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### listProviders()

> `static` **listProviders**(): `string`[]

List the names of all registered providers.

#### Returns

`string`[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Clear all registered handlers (for testing).

#### Returns

`void`

---

### generate()

#### Call Signature

> `static` **generate**(`provider`, `options`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

Generate a single video clip via the registered handler.

##### Parameters

###### provider

`string`

Registered provider name (e.g. "vertex", "kling")

###### options

[`VideoGenerateOptions`](../type-aliases/VideoGenerateOptions.md)

Bag of the source image, prompt, optional region
override, and resolution / length / aspect-ratio / audio options.
Translated internally into the handler-level 4-positional-argument
call — `VideoHandler.generate()`'s own signature is unchanged.

##### Returns

`Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

##### Throws

VideoError on registry miss, handler-not-configured, or
generation failure

#### Call Signature

> `static` **generate**(`provider`, `image`, `prompt`, `options`, `region?`): `Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

##### Parameters

###### provider

`string`

###### image

`Buffer`

###### prompt

`string`

###### options

[`VideoOutputOptions`](../type-aliases/VideoOutputOptions.md)

###### region?

`string`

##### Returns

`Promise`\<[`VideoGenerationResult`](../type-aliases/VideoGenerationResult.md)\>

##### Deprecated

Positional form kept for backward compatibility with
pre-bag callers (VideoProcessor is a public export). Use the
options-bag overload.

---

### generateTransition()

> `static` **generateTransition**(`provider`, `firstFrame`, `lastFrame`, `prompt`, `options?`, `region?`): `Promise`\<`Buffer`\<`ArrayBufferLike`\>\>

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
