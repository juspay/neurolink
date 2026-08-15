[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MessageBusConfig

# Type Alias: MessageBusConfig

> **MessageBusConfig** = `object`

Defined in: [types/agentNetwork.ts:1156](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1156)

Message bus configuration

## Properties

### maxHistorySize?

> `optional` **maxHistorySize?**: `number`

Defined in: [types/agentNetwork.ts:1158](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1158)

Maximum messages to retain in history

---

### defaultTtl?

> `optional` **defaultTtl?**: `number`

Defined in: [types/agentNetwork.ts:1161](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1161)

Default message TTL in ms

---

### enablePersistence?

> `optional` **enablePersistence?**: `boolean`

Defined in: [types/agentNetwork.ts:1164](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1164)

Enable message persistence

---

### enableDeadLetterQueue?

> `optional` **enableDeadLetterQueue?**: `boolean`

Defined in: [types/agentNetwork.ts:1167](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1167)

Dead letter queue for failed messages

---

### requestTimeout?

> `optional` **requestTimeout?**: `number`

Defined in: [types/agentNetwork.ts:1170](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/agentNetwork.ts#L1170)

Request timeout for request-response pattern
