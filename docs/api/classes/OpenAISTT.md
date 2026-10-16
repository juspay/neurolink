[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAISTT

# Class: OpenAISTT

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new OpenAISTT**(`apiKeyOrCredentials?`, `baseUrl?`): `OpenAISTT`

#### Parameters

##### apiKeyOrCredentials?

`string` \| \{ `apiKey?`: `string`; `baseURL?`: `string`; `timeoutMs?`: `number`; `model?`: `string`; `priorLanguageForm?`: `string`; `lidModel?`: `string`; `vocabularyPrompt?`: `boolean`; \}

The `credentials.stt.whisper` slice
(`apiKey`, `baseURL`, `timeoutMs`), or — the original positional form —
an API key. Anything left out falls back to the environment.

`string`

---

###### Type Literal

\{ `apiKey?`: `string`; `baseURL?`: `string`; `timeoutMs?`: `number`; `model?`: `string`; `priorLanguageForm?`: `string`; `lidModel?`: `string`; `vocabularyPrompt?`: `boolean`; \}

The `credentials.stt.whisper` slice
(`apiKey`, `baseURL`, `timeoutMs`), or — the original positional form —
an API key. Anything left out falls back to the environment.

###### apiKey?

`string`

###### baseURL?

`string`

###### timeoutMs?

`number`

###### model?

`string`

Default model name sent to the endpoint (`whisper-1` when omitted).

###### priorLanguageForm?

`string`

See `STTEndpointConfig.priorLanguageForm`. Env: `OPENAI_STT_PRIOR_LANGUAGE_FORM`.

###### lidModel?

`string`

See `STTEndpointConfig.lidModel`. Env: `OPENAI_STT_LID_MODEL`.

###### vocabularyPrompt?

`boolean`

See `STTEndpointConfig.vocabularyPrompt`. Env: `OPENAI_STT_VOCABULARY_PROMPT`.

##### baseUrl?

`string`

Base URL, positional form only.

#### Returns

`OpenAISTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `number`

Maximum audio duration in seconds (25 minutes)

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `false` = `false`

Whisper does not support streaming

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### languageProbeModel()

> **languageProbeModel**(): `string` \| `undefined`

The model name that runs this engine in language-identification-only
mode (no transcript, just the language verdict and scores, in a fraction
of the time), when the server has one. The batch path probes with it
before deciding which engine transcribes.

#### Returns

`string` \| `undefined`

#### Implementation of

`STTHandler.languageProbeModel`

---

### isConfigured()

> **isConfigured**(): `boolean`

OpenAI itself needs a key. A compatible server at another base URL may
not (a self-hosted engine on the local network), so a base URL alone
configures the handler and the request goes without an Authorization header.

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### getSupportedFormats()

> **getSupportedFormats**(): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

#### Implementation of

`STTHandler.getSupportedFormats`

---

### getSupportedLanguages()

> **getSupportedLanguages**(): `Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Returns

`Promise`\<[`STTLanguage`](../type-aliases/STTLanguage.md)[]\>

#### Implementation of

`STTHandler.getSupportedLanguages`

---

### transcribe()

> **transcribe**(`audio`, `options?`): `Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

#### Parameters

##### audio

`ArrayBuffer` \| `Buffer`\<`ArrayBufferLike`\>

##### options?

[`STTOptions`](../type-aliases/STTOptions.md) = `{}`

#### Returns

`Promise`\<[`STTResult`](../type-aliases/STTResult.md)\>

#### Implementation of

`STTHandler.transcribe`
