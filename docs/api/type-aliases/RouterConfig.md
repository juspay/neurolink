[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouterConfig

# Type Alias: RouterConfig

> **RouterConfig** = `object`

Defined in: [types/agentNetwork.ts:305](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L305)

Router configuration

## Properties

### provider?

> `optional` **provider?**: [`AIProviderName`](../enumerations/AIProviderName.md) \| `string`

Defined in: [types/agentNetwork.ts:307](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L307)

Provider for the routing agent

---

### model?

> `optional` **model?**: `string`

Defined in: [types/agentNetwork.ts:310](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L310)

Model for the routing agent

---

### instructions?

> `optional` **instructions?**: `string`

Defined in: [types/agentNetwork.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L313)

Custom routing instructions

---

### maxAttempts?

> `optional` **maxAttempts?**: `number`

Defined in: [types/agentNetwork.ts:316](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L316)

Maximum routing attempts before fallback

---

### confidenceThreshold?

> `optional` **confidenceThreshold?**: `number`

Defined in: [types/agentNetwork.ts:319](https://github.com/juspay/neurolink/blob/release/src/lib/types/agentNetwork.ts#L319)

Confidence threshold for routing (0-1)
