[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSHandler

# Type Alias: TTSHandler

> **TTSHandler** = `object`

Defined in: [types/common.ts:512](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L512)

TTS Handler interface for provider-specific implementations

Each provider (Google AI, OpenAI, etc.) implements this interface
to provide TTS generation capabilities using their respective APIs.

**Timeout Handling:**
Implementations MUST handle their own timeouts for the `synthesize()` method.
Recommended timeout: 30 seconds. Implementations should use `withTimeout()` utility
or provider-specific timeout mechanisms (e.g., Google Cloud client timeout).

**Error Handling:**
Implementations should throw TTSError for all failures, including timeouts.
Use appropriate error codes from TTS_ERROR_CODES.

## Example

```typescript
class MyTTSHandler implements TTSHandler {
  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    // REQUIRED: Implement timeout handling
    return await withTimeout(
      this.actualSynthesis(text, options),
      30000, // 30 second timeout
      "TTS synthesis timed out",
    );
  }

  isConfigured(): boolean {
    return !!process.env.MY_TTS_API_KEY;
  }
}
```

## Properties

### maxTextLength?

> `optional` **maxTextLength?**: `number`

Defined in: [types/common.ts:548](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L548)

Maximum text length supported by this provider (in bytes)
Different providers have different limits

#### Default

```ts
3000 if not specified
```

## Methods

### synthesize()

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](TTSResult.md)\>

Defined in: [types/common.ts:525](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L525)

Generate audio from text using provider-specific TTS API

**IMPORTANT: Timeout Responsibility**
Implementations MUST enforce their own timeouts (recommended: 30 seconds).
Use the `withTimeout()` utility or provider-specific timeout mechanisms.

#### Parameters

##### text

`string`

Text to convert to speech (pre-validated, non-empty, within length limits)

##### options

[`TTSOptions`](TTSOptions.md)

TTS configuration options (voice, format, speed, etc.)

#### Returns

`Promise`\<[`TTSResult`](TTSResult.md)\>

Audio buffer with metadata

#### Throws

On synthesis failure, timeout, or configuration issues

---

### getVoices()?

> `optional` **getVoices**(`languageCode?`): `Promise`\<[`TTSVoice`](TTSVoice.md)[]\>

Defined in: [types/common.ts:533](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L533)

Get available voices for the provider

#### Parameters

##### languageCode?

`string`

Optional language filter (e.g., "en-US")

#### Returns

`Promise`\<[`TTSVoice`](TTSVoice.md)[]\>

List of available voices

---

### isConfigured()

> **isConfigured**(): `boolean`

Defined in: [types/common.ts:540](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/common.ts#L540)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS
