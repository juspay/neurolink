[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1818)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1820)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1822)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1824)

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

Defined in: [types/generate.ts:1830](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1830)

TTS synthesis time in milliseconds.
