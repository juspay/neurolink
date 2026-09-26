[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentRoutingDecision

# Type Alias: AgentRoutingDecision

> **AgentRoutingDecision** = `object`

Routing decision record

## Properties

### stepIndex

> **stepIndex**: `number`

Step at which decision was made

---

### taskDescription

> **taskDescription**: `string`

Task description analyzed

---

### selectedPrimitive

> **selectedPrimitive**: `object`

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

Confidence score (0-1)

---

### reasoning

> **reasoning**: `string`

Reasoning for the decision

---

### alternatives?

> `optional` **alternatives?**: `object`[]

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

Formatted input for the selected primitive
