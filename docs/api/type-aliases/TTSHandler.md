[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSHandler

# Type Alias: TTSHandler

> **TTSHandler** = `object`

Defined in: [types/common.ts:482](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L482)

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

Defined in: [types/common.ts:518](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L518)

Maximum text length supported by this provider (in bytes)
Different providers have different limits

#### Default

```ts
3000 if not specified
```

## Methods

### synthesize()

> **synthesize**(`text`, `options`): `Promise`\<[`TTSResult`](TTSResult.md)\>

Defined in: [types/common.ts:495](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L495)

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

Defined in: [types/common.ts:503](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L503)

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

Defined in: [types/common.ts:510](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L510)

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS
