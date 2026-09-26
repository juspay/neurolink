[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingModelConfig

# Type Alias: ToolRoutingModelConfig

> **ToolRoutingModelConfig** = `object`

LLM settings for the router call. Fields omitted here fall back to the
stream call's own provider/model/region, so the router uses the same model
as the main chat call unless explicitly overridden.

## Properties

### provider?

> `optional` **provider?**: `string`

---

### model?

> `optional` **model?**: `string`

---

### region?

> `optional` **region?**: `string`

---

### temperature?

> `optional` **temperature?**: `number`

Router sampling temperature. Default: 0.
