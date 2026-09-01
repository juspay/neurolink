[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1690](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1690)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1692](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1692)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1694](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1694)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1696](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1696)

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

Defined in: [types/generate.ts:1702](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1702)

TTS synthesis time in milliseconds.
