[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRegistrationOptions

# Type Alias: ToolRegistrationOptions

> **ToolRegistrationOptions** = `object`

Defined in: [types/tools.ts:195](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L195)

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

Defined in: [types/tools.ts:198](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L198)

Per-tool execution timeout in milliseconds. Only applied when explicitly set.
When omitted, the SDK's global default (30s) is used.

---

### maxRetries?

> `optional` **maxRetries?**: `number`

Defined in: [types/tools.ts:202](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/tools.ts#L202)

Maximum retry attempts on failure. Only applied when explicitly set.
When omitted, the SDK's global default (2 retries) is used.
Set to 0 to disable retries for this tool.
