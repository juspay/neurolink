[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1713](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1713)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1715](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1715)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1717)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1719)

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

Defined in: [types/generate.ts:1725](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1725)

TTS synthesis time in milliseconds.
