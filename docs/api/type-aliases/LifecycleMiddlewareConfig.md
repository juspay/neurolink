[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LifecycleMiddlewareConfig

# Type Alias: LifecycleMiddlewareConfig

> **LifecycleMiddlewareConfig** = `object`

Defined in: [types/middleware.ts:363](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L363)

Configuration for the lifecycle middleware.
Pass callbacks to observe generation/streaming lifecycle events.

## Properties

### onFinish?

> `optional` **onFinish?**: [`OnFinishCallback`](OnFinishCallback.md)

Defined in: [types/middleware.ts:364](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L364)

---

### onError?

> `optional` **onError?**: [`OnErrorCallback`](OnErrorCallback.md)

Defined in: [types/middleware.ts:365](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L365)

---

### onChunk?

> `optional` **onChunk?**: [`OnChunkCallback`](OnChunkCallback.md)

Defined in: [types/middleware.ts:366](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L366)

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/middleware.ts:377](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L377)

Per-callback deadline in milliseconds applied to every
`onChunk` / `onFinish` / `onError` invocation. When a callback
exceeds this it is logged and abandoned — generate()/stream()
still resolves or rejects on schedule.

Defaults to the `NEUROLINK_LIFECYCLE_TIMEOUT_MS` env var (also
read by the CLI) and ultimately falls back to 5_000. Set `0`
to make consumer callbacks effectively fire-and-forget.
