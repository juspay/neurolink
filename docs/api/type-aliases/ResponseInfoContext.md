[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

---

### finishReason?

> `optional` **finishReason?**: `string`

---

### stopSequence?

> `optional` **stopSequence?**: `string`

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Names of the tools the model actually invoked (tool_use blocks).
