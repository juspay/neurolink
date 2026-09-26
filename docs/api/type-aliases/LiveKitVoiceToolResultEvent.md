[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LiveKitVoiceToolResultEvent

# Type Alias: LiveKitVoiceToolResultEvent

> **LiveKitVoiceToolResultEvent** = `object`

A tool invocation has finished. `result` carries the tool's structured
output (for example, a chart payload) for the client to render.

## Properties

### type

> **type**: `"tool-result"`

---

### data

> **data**: `object`

#### id?

> `optional` **id?**: `string`

#### name

> **name**: `string`

#### result?

> `optional` **result?**: `unknown`

#### success?

> `optional` **success?**: `boolean`

#### error?

> `optional` **error?**: `string`
