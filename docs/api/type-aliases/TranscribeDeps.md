[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TranscribeDeps

# Type Alias: TranscribeDeps

> **TranscribeDeps** = [`STTCorrectionDeps`](STTCorrectionDeps.md) & `object`

Everything the transcribe orchestration (batch and stream) needs from the
SDK, bound by `NeuroLink` so the orchestration modules stay testable.

## Type Declaration

### transcribe

> **transcribe**: (`audio`, `provider`, `options`) => `Promise`\<[`STTResult`](STTResult.md)\>

`STTProcessor.transcribe` with the request's credentials already applied.

#### Parameters

##### audio

`Buffer`

##### provider

`string`

##### options

[`STTOptions`](STTOptions.md)

#### Returns

`Promise`\<[`STTResult`](STTResult.md)\>

### resolveProvider

> **resolveProvider**: (`name?`) => `string`

Resolves `undefined`, `""` or an alias to a registered provider name, or throws a typed error.

#### Parameters

##### name?

`string`

#### Returns

`string`

### getHandler

> **getHandler**: (`name`) => [`STTHandler`](STTHandler.md) \| `undefined`

#### Parameters

##### name

`string`

#### Returns

[`STTHandler`](STTHandler.md) \| `undefined`
