[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkTokenUsage

# Type Alias: NetworkTokenUsage

> **NetworkTokenUsage** = `object`

Defined in: [types/agentNetwork.ts:549](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L549)

Token usage aggregated across the network

## Properties

### promptTokens

> **promptTokens**: `number`

Defined in: [types/agentNetwork.ts:551](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L551)

Total prompt tokens

---

### completionTokens

> **completionTokens**: `number`

Defined in: [types/agentNetwork.ts:554](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L554)

Total completion tokens

---

### totalTokens

> **totalTokens**: `number`

Defined in: [types/agentNetwork.ts:557](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L557)

Total tokens

---

### byAgent?

> `optional` **byAgent?**: `Record`\<`string`, \{ `promptTokens`: `number`; `completionTokens`: `number`; `totalTokens`: `number`; \}\>

Defined in: [types/agentNetwork.ts:560](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L560)

Breakdown by agent
