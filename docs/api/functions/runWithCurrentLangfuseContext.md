[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / runWithCurrentLangfuseContext

# Function: runWithCurrentLangfuseContext()

> **runWithCurrentLangfuseContext**\<`T`\>(`fn`): () => `Promise`\<`T`\>

Defined in: [services/server/ai/observability/instrumentation.ts:1480](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/services/server/ai/observability/instrumentation.ts#L1480)

Capture the current Langfuse AsyncLocalStorage context and return a wrapper
that re-enters that context when executing the provided callback.

This is essential for preserving trace context across async boundaries that
break the automatic ALS propagation chain, such as `setImmediate()`,
`setTimeout()`, or event-emitter callbacks. Without this, spans created
inside those callbacks become orphaned traces in Langfuse.

**How it works:**

1. Captures the current ALS store at call time (synchronously).
2. Returns an async function that, when invoked, re-enters the captured
   context via `contextStorage.run()` before executing the callback.
3. If no context exists at capture time, the callback runs without
   ALS wrapping (no-op passthrough).

## Type Parameters

### T

`T`

## Parameters

### fn

() => `Promise`\<`T`\>

The async function to execute within the captured context

## Returns

A new async function that preserves the Langfuse ALS context

() => `Promise`\<`T`\>

## Example

```ts
// Before (broken — setImmediate loses ALS context):
setImmediate(async () => {
  await this.checkAndSummarize(session, threshold);
});

// After (fixed — context is captured and re-entered):
const wrappedFn = runWithCurrentLangfuseContext(async () => {
  await this.checkAndSummarize(session, threshold);
});
setImmediate(wrappedFn);
```
