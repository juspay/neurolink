[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistrationOptions

# Type Alias: ToolRegistrationOptions

> **ToolRegistrationOptions** = `object`

Defined in: [types/tools.ts:215](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L215)

Options for tool registration via registerTool()

These options configure per-tool execution behavior. When not provided,
the SDK's global defaults are used (30s timeout, 2 retries), preserving
backward compatibility with existing production systems.

## Example

```ts
// Register with custom timeout and no retries
sdk.registerTool("myTool", tool, { timeout: 5000, maxRetries: 0 });

// Register with defaults (same as before — no behavior change)
sdk.registerTool("myTool", tool);
```

## Properties

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/tools.ts:218](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L218)

Per-tool execution timeout in milliseconds. Only applied when explicitly set.
When omitted, the SDK's global default (30s) is used.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:222](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L222)

Maximum retry attempts on failure. Only applied when explicitly set.
When omitted, the SDK's global default (2 retries) is used.
Set to 0 to disable retries for this tool.

---

### totalTimeoutMs?

> `optional` **totalTimeoutMs?**: `number`

Defined in: [types/tools.ts:225](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L225)

Ceiling on the whole execution across every attempt and the delays
between them. When omitted, `timeout * (maxRetries + 1)` is used.

---

### cacheable?

> `optional` **cacheable?**: `boolean`

Defined in: [types/tools.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/tools.ts#L236)

Whether this tool's result may be served from the tool-result cache
(default true).

Set to `false` for a tool whose result is NOT a function of its arguments
— anything reading or mutating live state. The cache is keyed by tool name
plus arguments, so a stateful tool called twice with the same arguments
replays its first answer for the whole TTL: a checklist that never updates,
a queue that hands out the same item twice.
