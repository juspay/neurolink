[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / NetworkMemoryConfig

# Type Alias: NetworkMemoryConfig

> **NetworkMemoryConfig** = `object`

Defined in: [types/agentNetwork.ts:325](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L325)

Memory configuration for the network

## Properties

### shared?

> `optional` **shared?**: `boolean`

Defined in: [types/agentNetwork.ts:327](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L327)

Enable shared memory across agents

---

### provider?

> `optional` **provider?**: `"in-memory"` \| `"redis"`

Defined in: [types/agentNetwork.ts:330](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L330)

Memory provider

---

### ttl?

> `optional` **ttl?**: `number`

Defined in: [types/agentNetwork.ts:333](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L333)

Memory TTL in seconds

---

### maxMessages?

> `optional` **maxMessages?**: `number`

Defined in: [types/agentNetwork.ts:336](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L336)

Maximum messages to retain
