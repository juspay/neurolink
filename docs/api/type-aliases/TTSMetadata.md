[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TTSMetadata

# Type Alias: TTSMetadata

> **TTSMetadata** = `object`

Enhanced result type with optional analytics/evaluation

## Properties

### attempted

> **attempted**: `boolean`

Whether TTS synthesis was invoked. False indicates TTS was skipped.

---

### success

> **success**: `boolean`

Whether TTS synthesis completed successfully.

---

### mode?

> `optional` **mode?**: [`TTSSynthesisMode`](TTSSynthesisMode.md)

What was synthesized: the input text (`"direct"`) or the model's reply
(`"response"`). Set by `generate()`; `stream()` always synthesizes the
response and reports `"response"` where it records metadata.

---

### error?

> `optional` **error?**: `object`

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

TTS synthesis time in milliseconds.
