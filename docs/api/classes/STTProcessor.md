[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / STTProcessor

# Class: STTProcessor

Defined in: [utils/sttProcessor.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L40)

STT processor class for orchestrating speech-to-text operations

Follows the same pattern as TTSProcessor, CSVProcessor, ImageProcessor, and PDFProcessor.
Provides a unified interface for STT transcription across multiple providers.

## Example

```typescript
// Register a handler
STTProcessor.registerHandler("whisper", whisperHandler);

// Check if provider is supported
if (STTProcessor.supports("whisper")) {
  // Provider is registered
}
```

## Constructors

### Constructor

> **new STTProcessor**(): `STTProcessor`

#### Returns

`STTProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Defined in: [utils/sttProcessor.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L80)

Register an STT handler for a specific provider

Allows providers to register their STT implementation at runtime.

#### Parameters

##### providerName

`string`

Provider identifier (e.g., 'whisper', 'deepgram')

##### handler

[`STTHandler`](../type-aliases/STTHandler.md)

STT handler implementation

#### Returns

`void`

#### Example

```typescript
const whisperHandler: STTHandler = {
  transcribe: async (audio, options) => { ... },
  getSupportedFormats: () => ["mp3", "wav"],
  isConfigured: () => true
};

STTProcessor.registerHandler('whisper', whisperHandler);
```

---

### getHandler()

> `static` **getHandler**(`providerName`): [`STTHandler`](../type-aliases/STTHandler.md) \| `undefined`

Defined in: [utils/sttProcessor.ts:99](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L99)

Get a registered STT handler by provider name.

Exposed publicly so module-level auto-registration code can reuse an
already-registered primary handler when backfilling its aliases.

#### Parameters

##### providerName

`string`

Provider identifier

#### Returns

[`STTHandler`](../type-aliases/STTHandler.md) \| `undefined`

Handler instance or undefined if not registered

---

### listProviders()

> `static` **listProviders**(): `string`[]

Defined in: [utils/sttProcessor.ts:106](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L106)

List the names of all registered providers.

#### Returns

`string`[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Defined in: [utils/sttProcessor.ts:114](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L114)

Removes every registered STT handler. Primarily for test isolation —
production code should not need to call this.

#### Returns

`void`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [utils/sttProcessor.ts:131](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L131)

Check if a provider is supported (has a registered STT handler)

#### Parameters

##### providerName

`string`

Provider identifier

#### Returns

`boolean`

True if handler is registered

#### Example

```typescript
if (STTProcessor.supports("whisper")) {
  console.log("Whisper STT is supported");
}
```

---

### transcribe()

> `static` **transcribe**(`audio`, `provider`, `options`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

Defined in: [utils/sttProcessor.ts:175](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/utils/sttProcessor.ts#L175)

Transcribe audio to text using a registered STT provider

Orchestrates the speech-to-text transcription process:

1. Validates audio input (non-empty)
2. Looks up the provider handler
3. Verifies provider configuration
4. Delegates transcription to the provider
5. Enriches result with provider metadata

#### Parameters

##### audio

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

Audio data as Buffer or ArrayBuffer

##### provider

`string`

Provider identifier

##### options

[`STTOptions`](../type-aliases/STTOptions.md)

STT configuration options

#### Returns

`Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

Transcription result with text and metadata

#### Throws

STTError if validation fails or provider not supported/configured

#### Example

```typescript
const result = await STTProcessor.transcribe(audioBuffer, "whisper", {
  language: "en-US",
  punctuation: true,
});

console.log(`Transcription: ${result.text}`);
console.log(`Confidence: ${result.confidence}`);
```
