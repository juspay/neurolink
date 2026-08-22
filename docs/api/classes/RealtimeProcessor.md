[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RealtimeProcessor

# Class: RealtimeProcessor

Defined in: [voice/RealtimeVoiceAPI.ts:53](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L53)

Realtime Processor class for orchestrating realtime voice operations

Provides a unified interface for realtime voice across multiple providers.

## Example

```typescript
// Register a handler (typically done in providerRegistry.ts on startup)
RealtimeProcessor.registerHandler("openai-realtime", openaiHandler);

// Connect to a session — the first arg is the registered handler key,
// and `config.provider` must match the same key.
const session = await RealtimeProcessor.connect("openai-realtime", {
  provider: "openai-realtime",
  voice: "alloy",
  systemPrompt: "You are a helpful assistant.",
});

// Send audio
await RealtimeProcessor.sendAudio("openai-realtime", audioBuffer);

// Disconnect
await RealtimeProcessor.disconnect("openai-realtime");
```

## Constructors

### Constructor

> **new RealtimeProcessor**(): `RealtimeProcessor`

#### Returns

`RealtimeProcessor`

## Methods

### registerHandler()

> `static` **registerHandler**(`providerName`, `handler`): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:72](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L72)

Register a Realtime handler for a specific provider

#### Parameters

##### providerName

`string`

Provider identifier (e.g., 'openai', 'gemini')

##### handler

[`RealtimeHandler`](../type-aliases/RealtimeHandler.md)

Realtime handler implementation

#### Returns

`void`

---

### getHandler()

> `static` **getHandler**(`providerName`): [`RealtimeHandler`](../type-aliases/RealtimeHandler.md) \| `undefined`

Defined in: [voice/RealtimeVoiceAPI.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L88)

Get a registered Realtime handler by provider name.

Exposed publicly so module-level auto-registration code can reuse an
already-registered primary handler when backfilling its aliases.

#### Parameters

##### providerName

`string`

#### Returns

[`RealtimeHandler`](../type-aliases/RealtimeHandler.md) \| `undefined`

---

### supports()

> `static` **supports**(`providerName`): `boolean`

Defined in: [voice/RealtimeVoiceAPI.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L95)

Check if a provider is supported

#### Parameters

##### providerName

`string`

#### Returns

`boolean`

---

### getProviders()

> `static` **getProviders**(): `string`[]

Defined in: [voice/RealtimeVoiceAPI.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L102)

Get list of all registered providers

#### Returns

`string`[]

---

### connect()

> `static` **connect**(`provider`, `config`, `handlers?`): `Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

Defined in: [voice/RealtimeVoiceAPI.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L114)

Connect to a realtime session

#### Parameters

##### provider

`string`

Provider identifier

##### config

[`RealtimeConfig`](../type-aliases/RealtimeConfig.md)

Session configuration

##### handlers?

[`RealtimeEventHandlers`](../type-aliases/RealtimeEventHandlers.md)

Event handlers

#### Returns

`Promise`\<[`RealtimeSession`](../type-aliases/RealtimeSession.md)\>

Session information

---

### disconnect()

> `static` **disconnect**(`provider`): `Promise`\<`void`\>

Defined in: [voice/RealtimeVoiceAPI.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L180)

Disconnect from a realtime session

#### Parameters

##### provider

`string`

Provider identifier

#### Returns

`Promise`\<`void`\>

---

### sendAudio()

> `static` **sendAudio**(`provider`, `audio`): `Promise`\<`void`\>

Defined in: [voice/RealtimeVoiceAPI.ts:221](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L221)

Send audio to a realtime session

#### Parameters

##### provider

`string`

Provider identifier

##### audio

`Buffer`\<`ArrayBufferLike`\> \| [`RealtimeAudioChunk`](../type-aliases/RealtimeAudioChunk.md)

Audio data

#### Returns

`Promise`\<`void`\>

---

### sendText()

> `static` **sendText**(`provider`, `text`): `Promise`\<`void`\>

Defined in: [voice/RealtimeVoiceAPI.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L254)

Send text to a realtime session

#### Parameters

##### provider

`string`

Provider identifier

##### text

`string`

Text to send

#### Returns

`Promise`\<`void`\>

---

### triggerResponse()

> `static` **triggerResponse**(`provider`): `Promise`\<`void`\>

Defined in: [voice/RealtimeVoiceAPI.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L302)

Trigger a response from the model (manual turn detection)

#### Parameters

##### provider

`string`

Provider identifier

#### Returns

`Promise`\<`void`\>

---

### cancelResponse()

> `static` **cancelResponse**(`provider`): `Promise`\<`void`\>

Defined in: [voice/RealtimeVoiceAPI.ts:338](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L338)

Cancel the current response

#### Parameters

##### provider

`string`

Provider identifier

#### Returns

`Promise`\<`void`\>

---

### getSession()

> `static` **getSession**(`provider`): [`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

Defined in: [voice/RealtimeVoiceAPI.ts:375](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L375)

Get current session for a provider

#### Parameters

##### provider

`string`

Provider identifier

#### Returns

[`RealtimeSession`](../type-aliases/RealtimeSession.md) \| `null`

Session or null

---

### isConnected()

> `static` **isConnected**(`provider`): `boolean`

Defined in: [voice/RealtimeVoiceAPI.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L385)

Check if a provider has an active session

#### Parameters

##### provider

`string`

Provider identifier

#### Returns

`boolean`

---

### getSupportedFormats()

> `static` **getSupportedFormats**(`provider`): [`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

Defined in: [voice/RealtimeVoiceAPI.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L395)

Get supported formats for a provider

#### Parameters

##### provider

`string`

Provider identifier

#### Returns

[`TTSAudioFormat`](../type-aliases/TTSAudioFormat.md)[]

---

### clearHandlers()

> `static` **clearHandlers**(): `void`

Defined in: [voice/RealtimeVoiceAPI.ts:403](https://github.com/juspay/neurolink/blob/release/src/lib/voice/RealtimeVoiceAPI.ts#L403)

Clear all handlers and sessions (for testing)

#### Returns

`void`
