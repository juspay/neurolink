[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingModelConfig

# Type Alias: ToolRoutingModelConfig

> **ToolRoutingModelConfig** = `object`

Defined in: [types/toolRouting.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L38)

LLM settings for the router call. Fields omitted here fall back to the
stream call's own provider/model/region, so the router uses the same model
as the main chat call unless explicitly overridden.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/toolRouting.ts:39](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L39)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/toolRouting.ts:40](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L40)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/toolRouting.ts:41](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L41)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/toolRouting.ts:43](https://github.com/juspay/neurolink/blob/release/src/lib/types/toolRouting.ts#L43)

Router sampling temperature. Default: 0.
