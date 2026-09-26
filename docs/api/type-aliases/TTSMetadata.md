[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1836](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1836)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1838)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1840)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1842)

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

Defined in: [types/generate.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1848)

TTS synthesis time in milliseconds.
