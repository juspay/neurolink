[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HITLConfirmationContext

# Type Alias: HITLConfirmationContext

> **HITLConfirmationContext** = `object`

Where, and for whom, a confirmation is requested

## Properties

### serverId?

> `optional` **serverId?**: `string`

MCP server ID (if this is an external tool)

---

### sessionId?

> `optional` **sessionId?**: `string`

User session identifier

---

### userId?

> `optional` **userId?**: `string`

User identifier

---

### signal?

> `optional` **signal?**: `AbortSignal`

Aborting it withdraws the pending confirmation (`hitl:cancelled`)
