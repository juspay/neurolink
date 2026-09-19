[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1799](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1799)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1801](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1801)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1803](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1803)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1805](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1805)

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

Defined in: [types/generate.ts:1811](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1811)

TTS synthesis time in milliseconds.
