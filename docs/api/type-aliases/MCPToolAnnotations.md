[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPToolAnnotations

# Type Alias: MCPToolAnnotations

> **MCPToolAnnotations** = `object`

Defined in: [types/mcp.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1052)

Tool annotation metadata for MCP tools.
Provides hints to AI models about tool behavior and safety.

## Properties

### title?

> `optional` **title?**: `string`

Defined in: [types/mcp.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1054)

Human-readable title for the tool

---

### readOnlyHint?

> `optional` **readOnlyHint?**: `boolean`

Defined in: [types/mcp.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1056)

Whether the tool only reads data without side effects

---

### destructiveHint?

> `optional` **destructiveHint?**: `boolean`

Defined in: [types/mcp.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1058)

Whether the tool performs destructive operations

---

### idempotentHint?

> `optional` **idempotentHint?**: `boolean`

Defined in: [types/mcp.ts:1060](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1060)

Whether the tool can be safely retried without side effects

---

### requiresConfirmation?

> `optional` **requiresConfirmation?**: `boolean`

Defined in: [types/mcp.ts:1062](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1062)

Whether the tool requires user confirmation before execution

---

### openWorldHint?

> `optional` **openWorldHint?**: `boolean`

Defined in: [types/mcp.ts:1064](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1064)

Whether the tool operates on an open world of resources

---

### tags?

> `optional` **tags?**: `string`[]

Defined in: [types/mcp.ts:1066](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1066)

Custom tags for categorization and filtering

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Defined in: [types/mcp.ts:1068](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1068)

Estimated execution time in milliseconds

---

### rateLimitHint?

> `optional` **rateLimitHint?**: `number`

Defined in: [types/mcp.ts:1070](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1070)

Rate limit hint (calls per minute)

---

### costHint?

> `optional` **costHint?**: `number`

Defined in: [types/mcp.ts:1072](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1072)

Cost hint (arbitrary units for comparison)

---

### complexity?

> `optional` **complexity?**: `"simple"` \| `"medium"` \| `"complex"`

Defined in: [types/mcp.ts:1074](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1074)

Complexity level for UI display

---

### auditRequired?

> `optional` **auditRequired?**: `boolean`

Defined in: [types/mcp.ts:1076](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1076)

Whether tool execution should be audited/logged

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"internal"` \| `"restricted"`

Defined in: [types/mcp.ts:1078](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1078)

Security classification for the tool
