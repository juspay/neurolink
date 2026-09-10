[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1736](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1736)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1738](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1738)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1740](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1740)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1742](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1742)

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

Defined in: [types/generate.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1748)

TTS synthesis time in milliseconds.
