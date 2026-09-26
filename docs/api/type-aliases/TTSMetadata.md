[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1849)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1851)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1853)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1855)

Structured synthesis error details, present only when synthesis failed.

#### code

> **code**: `string`

#### message

> **message**: `string`

#### retriable?

> `optional` **retriable?**: `boolean`

---

### latency?

> `optional` **latency?**: `number`

Defined in: [types/generate.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1861)

TTS synthesis time in milliseconds.
