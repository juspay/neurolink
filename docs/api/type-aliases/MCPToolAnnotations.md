[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPToolAnnotations

# Type Alias: MCPToolAnnotations

> **MCPToolAnnotations** = `object`

Tool annotation metadata for MCP tools.
Provides hints to AI models about tool behavior and safety.

## Properties

### title?

> `optional` **title?**: `string`

Human-readable title for the tool

---

### readOnlyHint?

> `optional` **readOnlyHint?**: `boolean`

Whether the tool only reads data without side effects

---

### destructiveHint?

> `optional` **destructiveHint?**: `boolean`

Whether the tool performs destructive operations

---

### idempotentHint?

> `optional` **idempotentHint?**: `boolean`

Whether the tool can be safely retried without side effects

---

### requiresConfirmation?

> `optional` **requiresConfirmation?**: `boolean`

Whether the tool requires user confirmation before execution

---

### openWorldHint?

> `optional` **openWorldHint?**: `boolean`

Whether the tool operates on an open world of resources

---

### tags?

> `optional` **tags?**: `string`[]

Custom tags for categorization and filtering

---

### estimatedDuration?

> `optional` **estimatedDuration?**: `number`

Estimated execution time in milliseconds

---

### rateLimitHint?

> `optional` **rateLimitHint?**: `number`

Rate limit hint (calls per minute)

---

### costHint?

> `optional` **costHint?**: `number`

Cost hint (arbitrary units for comparison)

---

### complexity?

> `optional` **complexity?**: `"simple"` \| `"medium"` \| `"complex"`

Complexity level for UI display

---

### auditRequired?

> `optional` **auditRequired?**: `boolean`

Whether tool execution should be audited/logged

---

### securityLevel?

> `optional` **securityLevel?**: `"public"` \| `"internal"` \| `"restricted"`

Security classification for the tool
