[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProcessor

# Class: TTSProcessor

Defined in: [utils/ttsProcessor.ts:76](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L76)

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

Defined in: [utils/ttsProcessor.ts:116](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L116)

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

Defined in: [utils/ttsProcessor.ts:136](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L136)

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

Defined in: [utils/ttsProcessor.ts:143](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L143)

List the names of all registered providers.

#### Returns

`string`[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Defined in: [utils/ttsProcessor.ts:151](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L151)

Removes every registered TTS handler. Primarily for test isolation —
production code should not need to call this.

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [utils/ttsProcessor.ts:168](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L168)

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

Defined in: [utils/ttsProcessor.ts:218](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/ttsProcessor.ts#L218)

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
