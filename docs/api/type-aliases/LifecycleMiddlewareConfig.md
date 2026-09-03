[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleMiddlewareConfig

# Type Alias: LifecycleMiddlewareConfig

> **LifecycleMiddlewareConfig** = `object`

Defined in: [types/middleware.ts:357](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L357)

Configuration for the lifecycle middleware.
Pass callbacks to observe generation/streaming lifecycle events.

## Properties

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/middleware.ts:358](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L358)

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/middleware.ts:359](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L359)

---

### onChunk?

> `optional` **onChunk?**: [`OnChunkCallback`](OnChunkCallback.md)

Defined in: [types/middleware.ts:360](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L360)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/middleware.ts:371](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L371)

Per-callback deadline in milliseconds applied to every
`onChunk` / `onFinish` / `onError` invocation. When a callback
exceeds this it is logged and abandoned — generate()/stream()
still resolves or rejects on schedule.

Defaults to the `NEUROLINK_LIFECYCLE_TIMEOUT_MS` env var (also
read by the CLI) and ultimately falls back to 5_000. Set `0`
to make consumer callbacks effectively fire-and-forget.
