[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ReplicatePollOptions

# Type Alias: ReplicatePollOptions

> **ReplicatePollOptions** = `object`

Options for the Replicate poll loop.

## Properties

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Total time to wait before throwing a timeout error (default 5 min).

---

### pollIntervalMs?

> `optional` **pollIntervalMs?**: `number`

Poll interval in milliseconds (default 2 s).

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

Caller-supplied AbortSignal to cancel polling early.
