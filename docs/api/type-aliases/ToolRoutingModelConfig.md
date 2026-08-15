[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolRoutingModelConfig

# Type Alias: ToolRoutingModelConfig

> **ToolRoutingModelConfig** = `object`

Defined in: [types/toolRouting.ts:37](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L37)

LLM settings for the router call. Fields omitted here fall back to the
stream call's own provider/model/region, so the router uses the same model
as the main chat call unless explicitly overridden.

## Properties

### provider?

> `optional` **provider?**: `string`

Defined in: [types/toolRouting.ts:38](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L38)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/toolRouting.ts:39](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L39)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/toolRouting.ts:40](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L40)

---

### temperature?

> `optional` **temperature?**: `number`

Defined in: [types/toolRouting.ts:42](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolRouting.ts#L42)

Router sampling temperature. Default: 0.
