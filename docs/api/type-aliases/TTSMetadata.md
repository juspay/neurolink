[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1672)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1674)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1676)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1678](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1678)

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

Defined in: [types/generate.ts:1684](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1684)

TTS synthesis time in milliseconds.
