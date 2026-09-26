[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationRequest

# Type Alias: AggregationRequest

> **AggregationRequest** = `object`

Aggregation request payload

## Properties

### sessionId

> **sessionId**: `string`

Protocol session ID

---

### state

> **state**: [`ProtocolState`](ProtocolState.md)

Protocol state

---

### data

> **data**: `object`

Aggregation data

#### results

> **results**: `object`[]

#### aggregationType

> **aggregationType**: `"merge"` \| `"summarize"` \| `"vote"` \| `"custom"`

#### customAggregator?

> `optional` **customAggregator?**: `string`
