[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRoutingDecision

# Type Alias: AgentRoutingDecision

> **AgentRoutingDecision** = `object`

Defined in: [types/agentNetwork.ts:515](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L515)

Routing decision record

## Properties

### stepIndex

> **stepIndex**: `number`

Defined in: [types/agentNetwork.ts:517](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L517)

Step at which decision was made

---

### taskDescription

> **taskDescription**: `string`

Defined in: [types/agentNetwork.ts:520](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L520)

Task description analyzed

---

### selectedPrimitive

> **selectedPrimitive**: `object`

Defined in: [types/agentNetwork.ts:523](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L523)

Selected primitive

#### type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

#### id

> **id**: `string`

#### name

> **name**: `string`

---

### confidence

> **confidence**: `number`

Defined in: [types/agentNetwork.ts:530](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L530)

Confidence score (0-1)

---

### reasoning

> **reasoning**: `string`

Defined in: [types/agentNetwork.ts:533](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L533)

Reasoning for the decision

---

### alternatives?

> `optional` **alternatives?**: `object`[]

Defined in: [types/agentNetwork.ts:536](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L536)

Alternative primitives considered

#### type

> **type**: [`NetworkPrimitiveType`](NetworkPrimitiveType.md)

#### id

> **id**: `string`

#### confidence

> **confidence**: `number`

---

### formattedInput?

> `optional` **formattedInput?**: `string`

Defined in: [types/agentNetwork.ts:543](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L543)

Formatted input for the selected primitive
