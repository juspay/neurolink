[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleMiddlewareConfig

# Type Alias: LifecycleMiddlewareConfig

> **LifecycleMiddlewareConfig** = `object`

Configuration for the lifecycle middleware.
Pass callbacks to observe generation/streaming lifecycle events.

## Properties

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

---

### onChunk?

> `optional` **onChunk?**: [`OnChunkCallback`](OnChunkCallback.md)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-callback deadline in milliseconds applied to every
`onChunk` / `onFinish` / `onError` invocation. When a callback
exceeds this it is logged and abandoned — generate()/stream()
still resolves or rejects on schedule.

Defaults to the `NEUROLINK_LIFECYCLE_TIMEOUT_MS` env var (also
read by the CLI) and ultimately falls back to 5_000. Set `0`
to make consumer callbacks effectively fire-and-forget.
