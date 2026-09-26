[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CartesiaTTS

# Class: CartesiaTTS

Cartesia synchronous TTS handler.

Auth: `X-API-Key: ${CARTESIA_API_KEY}` + `Cartesia-Version` header.

## Implements

- [`TTSHandler`](../type-aliases/TTSHandler.md)

## Constructors

### Constructor

> **new CartesiaTTS**(`apiKey?`): `CartesiaTTS`

#### Parameters

##### apiKey?

`string`

#### Returns

`CartesiaTTS`

## Properties

### maxTextLength

> `readonly` **maxTextLength**: `5000` = `5000`

Maximum text length supported by this provider (in bytes)
Different providers have different limits

#### Default

```ts
3000 if not specified
```

#### Implementation of

`TTSHandler.maxTextLength`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

Validate that the provider is properly configured

#### Returns

`boolean`

True if provider can generate TTS

#### Implementation of

`TTSHandler.isConfigured`

---

### synthesize()

> **synthesize**(`text`, `options?`): `Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Generate audio from text using provider-specific TTS API

**IMPORTANT: Timeout Responsibility**
Implementations MUST enforce their own timeouts (recommended: 30 seconds).
Use the `withTimeout()` utility or provider-specific timeout mechanisms.

#### Parameters

##### text

`string`

Text to convert to speech (pre-validated, non-empty, within length limits)

##### options?

[`TTSOptions`](../type-aliases/TTSOptions.md) = `{}`

TTS configuration options (voice, format, speed, etc.)

#### Returns

`Promise`\<[`TTSResult`](../type-aliases/TTSResult.md)\>

Audio buffer with metadata

#### Throws

On synthesis failure, timeout, or configuration issues

#### Implementation of

`TTSHandler.synthesize`
