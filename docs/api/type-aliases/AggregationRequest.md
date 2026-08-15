[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AggregationRequest

# Type Alias: AggregationRequest

> **AggregationRequest** = `object`

Defined in: [types/agentNetwork.ts:1191](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1191)

Aggregation request payload

## Properties

### sessionId

> **sessionId**: `string`

Defined in: [types/agentNetwork.ts:1193](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1193)

Protocol session ID

---

### state

> **state**: [`ProtocolState`](ProtocolState.md)

Defined in: [types/agentNetwork.ts:1196](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1196)

Protocol state

---

### data

> **data**: `object`

Defined in: [types/agentNetwork.ts:1199](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1199)

Aggregation data

#### results

> **results**: `object`[]

#### aggregationType

> **aggregationType**: `"merge"` \| `"summarize"` \| `"vote"` \| `"custom"`

#### customAggregator?

> `optional` **customAggregator?**: `string`
