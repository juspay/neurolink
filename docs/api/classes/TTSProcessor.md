[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProcessor

# Class: TTSProcessor

Defined in: [utils/ttsProcessor.ts:290](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L290)

TTS processor class for orchestrating text-to-speech operations

Follows the same pattern as CSVProcessor, ImageProcessor, and PDFProcessor.
Provides a unified interface for TTS generation across multiple providers.

## Example

```typescript
// Register a handler
TTSProcessor.registerHandler("google-ai", googleAIHandler);

// Check if provider is supported
if (TTSProcessor.supports("google-ai")) {
  // Provider is registered
}
```

## Constructors

### Constructor

> **new TTSProcessor**(): `TTSProcessor`

#### Returns

`TTSProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Defined in: [utils/ttsProcessor.ts:330](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L330)

Register a TTS handler for a specific provider

Allows providers to register their TTS implementation at runtime.

#### Parameters

##### providerName

`string`

Provider identifier (e.g., 'google-ai', 'openai')

##### handler

[`TTSHandler`](../type-aliases/TTSHandler.md)

TTS handler implementation

#### Returns

`void`

#### Example

```typescript
const googleHandler: TTSHandler = {
  synthesize: async (text, options) => { ... },
  getVoices: async (languageCode) => { ... },
  isConfigured: () => true
};

TTSProcessor.registerHandler('google-ai', googleHandler);
```

---

### getHandler()

> `static` **getHandler**(`providerName`): [`TTSHandler`](../type-aliases/TTSHandler.md) \| `undefined`

Defined in: [utils/ttsProcessor.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L350)

Get a registered TTS handler by provider name.

Exposed publicly so module-level auto-registration code can reuse an
already-registered primary handler when backfilling its aliases —
see `src/lib/voice/index.ts:registerDefaultTTSHandlers`.

#### Parameters

##### providerName

`string`

Provider identifier

#### Returns

[`TTSHandler`](../type-aliases/TTSHandler.md) \| `undefined`

Handler instance or undefined if not registered

---

### listProviders()

> `static` **listProviders**(): `string`[]

Defined in: [utils/ttsProcessor.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L357)

List the names of all registered providers.

#### Returns

`string`[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Defined in: [utils/ttsProcessor.ts:365](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L365)

Removes every registered TTS handler. Primarily for test isolation —
production code should not need to call this.

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [utils/ttsProcessor.ts:382](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L382)

Check if a provider is supported (has a registered TTS handler)

#### Parameters

##### providerName

`string`

Provider identifier

#### Returns

`boolean`

True if handler is registered

#### Example

```typescript
if (TTSProcessor.supports("google-ai")) {
  console.log("Google AI TTS is supported");
}
```

---

### synthesize()

> `static` **synthesize**(`text`, `provider`, `options`): `Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Defined in: [utils/ttsProcessor.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L432)

Synthesize speech from text using a registered TTS provider

Orchestrates the text-to-speech generation process:

1. Validates input text (not empty, within length limits)
2. Looks up the provider handler
3. Verifies provider configuration
4. Delegates synthesis to the provider (timeout handled by provider)
5. Enriches result with metadata

**Timeout Handling:**
Timeouts are enforced by individual provider implementations (see TTSHandler interface).
Providers typically use 30-second timeouts via `withTimeout()` utility or
provider-specific timeout mechanisms (e.g., Google Cloud client timeout).

#### Parameters

##### text

`string`

Text to convert to speech

##### provider

`string`

Provider identifier

##### options

[`TTSOptions`](../type-aliases/TTSOptions.md)

TTS configuration options

#### Returns

`Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Audio result with buffer and metadata

#### Throws

TTSError if validation fails or provider not supported/configured

#### Example

```typescript
const result = await TTSProcessor.synthesize("Hello, world!", "google-ai", {
  voice: "en-US-Neural2-C",
  format: "mp3",
  speed: 1.0,
});

console.log(`Generated ${result.size} bytes of ${result.format} audio`);
// Save to file or play the audio buffer
```

---

### synthesizeStream()

> `static` **synthesizeStream**(`textChunks`, `provider`, `options`, `shouldStop?`): `AsyncGenerator`\<[`TTSChunk`](../type-aliases/TTSChunk.md)\>

Defined in: [utils/ttsProcessor.ts:862](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L862)

Incrementally synthesize sentence-buffered text chunks.

Text is flushed at a sentence boundary after `streamingBufferSize`
characters, or hard-split before the provider's maximum text length.

A segment is served by the handler's `synthesizeStream()` when it offers
one and returns a stream, and by `synthesize()` otherwise — including
when the native stream produces no deliverable audio at all, and including
every way capability discovery itself can fail. The preflight reads and
calls that decide whether a native stream exists all sit inside one
guarded region in `resolveNativeStream`, with the call site's own catch
backstopping it, so a handler that misbehaves while being ASKED lands on
the buffered path rather than costing the segment. That is what makes the
next sentence true of every segment rather than only of the ones that got
that far.

Either way the segment keeps the same handler registry, validation, error
normalization and `tts.synthesize` telemetry seam — exactly one span per
segment, opened by whichever path served it — cancellation included: a
segment whose stream is still in flight when the consumer stops records
its span from the unwind path rather than dropping it. Failures that
originate in the native segment's own work, once a stream has been
established, are a different case and keep the shaped failed-segment
semantics every synthesis failure has.

Provider-reported indexes, cumulative sizes and finality are discarded and
recomputed globally. A native fragment is dropped unless it carries a
non-empty binary payload, so no native read reaches the consumer as an
empty chunk; the buffered path is unfiltered and forwards whatever
`synthesize()` returns, so a handler that produces a zero-byte buffer
still yields an empty chunk and a repeated `cumulativeSize`. The most
recent successful audio chunk is held until another succeeds or the input
ends, so exactly one real audio chunk carries `isFinal: true` without
emitting a separate empty terminator chunk.

Segment production and per-segment synthesis are deliberately inline
rather than nested async generators: each additional generator layer costs
every chunk several microtask turns, which is directly observable at
`NeuroLink.stream()` as audio interleaving one text chunk later than it
does without native streaming.

#### Parameters

##### textChunks

`AsyncIterable`\<`string`\>

##### provider

`string`

##### options

[`TTSOptions`](../type-aliases/TTSOptions.md)

##### shouldStop?

() => `boolean`

#### Returns

`AsyncGenerator`\<[`TTSChunk`](../type-aliases/TTSChunk.md)\>
