[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FinishEvent

# Type Alias: FinishEvent

> **FinishEvent** = [`DataStreamEvent`](DataStreamEvent.md) & `object`

Data stream finish event.

## Type Declaration

### type

> **type**: `"finish"`

### data

> **data**: `object`

#### data.reason?

> `optional` **reason?**: `string`

#### data.usage?

> `optional` **usage?**: `object`

#### data.usage.input

> **input**: `number`

#### data.usage.output

> **output**: `number`

#### data.usage.total

> **total**: `number`
