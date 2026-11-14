[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderToolExecutorOptions

# Type Alias: ProviderToolExecutorOptions

> **ProviderToolExecutorOptions** = `object`

What a provider's tool loop passes to the `executeTool` handed to
`setupToolExecutor`, for one model tool call.

## Properties

### timeout?

> `optional` **timeout?**: `number`

Attempt timeout set when the tool was registered

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Retries set when the tool was registered

---

### abortSignal?

> `optional` **abortSignal?**: `AbortSignal`

The loop's signal for this call: the turn's abort, or the loop's
per-tool deadline. `NeuroLink.executeTool` takes it to the call's
confirmation, its attempts and the tool's execution context.

---

### pauseDeadline?

> `optional` **pauseDeadline?**: [`PauseDeadline`](PauseDeadline.md)

Pauses the loop's deadlines for this call. `NeuroLink.executeTool`'s
confirmation gate calls it around the wait for a human.
