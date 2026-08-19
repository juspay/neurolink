[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProcessor

# Class: TTSProcessor

Defined in: [utils/ttsProcessor.ts:171](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L171)

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

Defined in: [utils/ttsProcessor.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L211)

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

Defined in: [utils/ttsProcessor.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L231)

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

Defined in: [utils/ttsProcessor.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L238)

List the names of all registered providers.

#### Returns

`string`[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Defined in: [utils/ttsProcessor.ts:246](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L246)

Removes every registered TTS handler. Primarily for test isolation —
production code should not need to call this.

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [utils/ttsProcessor.ts:263](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L263)

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

Defined in: [utils/ttsProcessor.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L313)

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

Defined in: [utils/ttsProcessor.ts:465](https://github.com/juspay/neurolink/blob/release/src/lib/utils/ttsProcessor.ts#L465)

Incrementally synthesize sentence-buffered text chunks.

Text is flushed at a sentence boundary after `streamingBufferSize`
characters, or hard-split before the provider's maximum text length.
Each segment goes through `synthesize()`, preserving the existing handler
registry, validation, error normalization, and telemetry seam.

The most recent successful audio chunk is held until another succeeds or
the input ends, so exactly one real audio chunk carries `isFinal: true`
without emitting a separate empty terminator chunk.

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
