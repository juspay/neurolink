[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / FinishEvent

# Type Alias: FinishEvent

> **FinishEvent** = [`DataStreamEvent`](DataStreamEvent.md) & `object`

Defined in: [types/server.ts:1415](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/server.ts#L1415)

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
