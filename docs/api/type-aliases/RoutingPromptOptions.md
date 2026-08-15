[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RoutingPromptOptions

# Type Alias: RoutingPromptOptions

> **RoutingPromptOptions** = `object`

Defined in: [types/agentNetwork.ts:1644](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1644)

Options for routing prompt generation

## Properties

### includeAlternatives?

> `optional` **includeAlternatives?**: `boolean`

Defined in: [types/agentNetwork.ts:1646](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1646)

Include alternative primitives in response

---

### maxPrimitivesToShow?

> `optional` **maxPrimitivesToShow?**: `number`

Defined in: [types/agentNetwork.ts:1649](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1649)

Maximum primitives to include in prompt

---

### additionalContext?

> `optional` **additionalContext?**: `string`

Defined in: [types/agentNetwork.ts:1652](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1652)

Additional context for routing

---

### conversationHistory?

> `optional` **conversationHistory?**: `object`[]

Defined in: [types/agentNetwork.ts:1655](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1655)

Conversation history for context

#### role

> **role**: `string`

#### content

> **content**: `string`
