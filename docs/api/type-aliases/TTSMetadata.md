[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1681](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1681)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1683](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1683)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1685](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1685)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1687](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1687)

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

Defined in: [types/generate.ts:1693](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1693)

TTS synthesis time in milliseconds.
