[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InferenceKind

# Type Alias: InferenceKind

> **InferenceKind** = `"generate"` \| `"stream"` \| `"decide"`

Defined in: [types/providers.ts:2222](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2222)

The kinds of inference a provider can serve.

`generate` and `stream` both produce text. `decide` produces typed,
calibrated judgements and no text at all — see src/lib/types/decision.ts.
They are peers: a provider may serve any subset.
