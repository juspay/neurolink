[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSProcessor

# Class: TTSProcessor

Defined in: [utils/ttsProcessor.ts:75](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/ttsProcessor.ts#L75)

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

Defined in: [utils/ttsProcessor.ts:114](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/ttsProcessor.ts#L114)

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

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [utils/ttsProcessor.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/ttsProcessor.ts#L162)

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

Defined in: [utils/ttsProcessor.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/utils/ttsProcessor.ts#L213)

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
