[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1770](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1770)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1772](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1772)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1774](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1774)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1776](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1776)

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

Defined in: [types/generate.ts:1782](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1782)

TTS synthesis time in milliseconds.
