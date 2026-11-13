[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistrationOptions

# Type Alias: ToolRegistrationOptions

> **ToolRegistrationOptions** = `object`

Options for tool registration via registerTool()

These options configure per-tool execution behavior. When not provided,
`executeTool` uses the SDK's defaults: a 120 s timeout per attempt and 3
retries (up to 4 attempts), 1 s apart. A per-call `executeTool` option
overrides the registered value.

## Example

```ts
// Register with custom timeout and no retries
sdk.registerTool("myTool", tool, { timeout: 5000, maxRetries: 0 });

// Register with the defaults
sdk.registerTool("myTool", tool);
```

## Properties

### timeout?

> `optional` **timeout?**: `number`

Timeout for one attempt, in milliseconds. Only applied when explicitly
set. When omitted, the SDK's default (120 s) is used.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Maximum retries after a failed attempt. Only applied when explicitly set.
When omitted, the SDK's default (3 retries, so up to 4 attempts) is used.
Set to 0 to disable retries for this tool, as you should for a tool
whose effect must not happen twice.

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Ceiling on the whole execution across every attempt and the delays
between them. When omitted,
`timeout * (maxRetries + 1) + retryDelayMs * maxRetries` is used, the
retry delay being 1 s unless the call sets `retryDelayMs`.

---

### cacheable?

> `optional` **cacheable?**: `boolean`

Whether this tool's result may be served from the tool-result cache
(default true).

Set to `false` for a tool whose result is NOT a function of its arguments
— anything reading or mutating live state. The cache is keyed by tool name
plus arguments, so a stateful tool called twice with the same arguments
replays its first answer for the whole TTL: a checklist that never updates,
a queue that hands out the same item twice.
