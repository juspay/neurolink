[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationManagerConfig

# Type Alias: ElicitationManagerConfig

> **ElicitationManagerConfig** = `object`

Elicitation manager configuration

## Properties

### defaultTimeout?

> `optional` **defaultTimeout?**: `number`

Default timeout for elicitation requests

---

### enabled?

> `optional` **enabled?**: `boolean`

Whether to allow elicitation (can be disabled for automated environments)

---

### handler?

> `optional` **handler?**: [`ElicitationHandler`](ElicitationHandler.md)

Handler for processing elicitation requests

---

### fallbackBehavior?

> `optional` **fallbackBehavior?**: `"timeout"` \| `"default"` \| `"error"`

Fallback behavior when no handler is available
