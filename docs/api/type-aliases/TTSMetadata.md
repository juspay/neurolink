[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1908)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1910)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1912)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1914)

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

Defined in: [types/generate.ts:1920](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1920)

TTS synthesis time in milliseconds.
