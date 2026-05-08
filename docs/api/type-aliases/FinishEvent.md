[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FinishEvent

# Type Alias: FinishEvent

> **FinishEvent** = [`DataStreamEvent`](DataStreamEvent.md) & `object`

Defined in: [types/server.ts:1412](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1412)

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
