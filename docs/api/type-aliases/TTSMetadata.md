[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Defined in: [types/generate.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1754)

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Defined in: [types/generate.ts:1756](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1756)

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Defined in: [types/generate.ts:1758](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1758)

Whether TTS synthesis completed successfully.

---

### error?

> `optional` **error?**: `object`

Defined in: [types/generate.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1760)

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

Defined in: [types/generate.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1766)

TTS synthesis time in milliseconds.
