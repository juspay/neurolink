[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicatePollOptions

# Type Alias: ReplicatePollOptions

> **ReplicatePollOptions** = `object`

Defined in: [types/replicate.ts:65](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/replicate.ts#L65)

Options for the Replicate poll loop.

## Properties

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/replicate.ts:67](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/replicate.ts#L67)

Total time to wait before throwing a timeout error (default 5 min).

---

### pollIntervalMs?

> `optional` **pollIntervalMs?**: `number`

Defined in: [types/replicate.ts:69](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/replicate.ts#L69)

Poll interval in milliseconds (default 2 s).

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Defined in: [types/replicate.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/replicate.ts#L71)

Caller-supplied AbortSignal to cancel polling early.
