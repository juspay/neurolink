[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / WhistleSTT

# Class: WhistleSTT

## Implements

- [`STTHandler`](../type-aliases/STTHandler.md)

## Constructors

### Constructor

> **new WhistleSTT**(`slice?`): `WhistleSTT`

#### Parameters

##### slice?

###### modelDir?

`string`

###### autoDownload?

`boolean`

#### Returns

`WhistleSTT`

## Properties

### maxAudioDuration

> `readonly` **maxAudioDuration**: `number`

One hour per request (16 kHz float samples: ~230 MB in memory).

#### Implementation of

`STTHandler.maxAudioDuration`

---

### supportsStreaming

> `readonly` **supportsStreaming**: `true` = `true`

The engine has its own streaming decoder.

#### Implementation of

`STTHandler.supportsStreaming`

## Methods

### isConfigured()

> **isConfigured**(): `boolean`

True when the engine can run: its files are already in the model dir, or
it is allowed to fetch them. With `NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0` (or
`autoDownload: false`) and no files, it reports unconfigured, so a caller
asserting "no STT backend" is not answered by a 17 MB download.

#### Returns

`boolean`

#### Implementation of

`STTHandler.isConfigured`

---

### describeConfiguration()

> **describeConfiguration**(): `string`

What would make `isConfigured()` true, in the handler's own words — the
env var or key for a hosted engine, the files and their download URLs for
a local one. Appended to the "not configured" error so the caller is told
what to do rather than "set the required API keys".

#### Returns

`string`

#### Implementation of

`STTHandler.describeConfiguration`

---

### getModelDir()

> **getModelDir**(): `string`

Directory the engine's files live in.

#### Returns

`string`

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

### warmUp()

> **warmUp**(): `Promise`\<`void`\>

Download/verify the files and start the worker now rather than on the first request.

#### Returns

`Promise`\<`void`\>

---

### dispose()

> **dispose**(): `Promise`\<`void`\>

Stop the warm worker. The handler stays usable; the next call starts a new one.

#### Returns

`Promise`\<`void`\>

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

---

### transcribeStream()

> **transcribeStream**(`audioStream`, `options?`): `AsyncIterable`\<[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)\>

Native streaming. `audioStream` yields PCM16LE mono frames at
`options.sampleRate` (default 16 kHz), any frame size. Yields a final
segment for each run of words the engine commits (times from the start of
the stream; join the finals with a space for the transcript) and an
interim segment carrying the unconfirmed tail whenever it changes.

#### Parameters

##### audioStream

`AsyncIterable`\<`Buffer`\<`ArrayBufferLike`\>\>

##### options?

[`STTOptions`](../type-aliases/STTOptions.md) = `{}`

#### Returns

`AsyncIterable`\<[`TranscriptionSegment`](../type-aliases/TranscriptionSegment.md)\>

#### Implementation of

`STTHandler.transcribeStream`
