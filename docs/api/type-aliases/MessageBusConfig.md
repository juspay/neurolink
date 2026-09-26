[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MessageBusConfig

# Type Alias: MessageBusConfig

> **MessageBusConfig** = `object`

Message bus configuration

## Properties

### maxHistorySize?

> `optional` **maxHistorySize?**: `number`

Maximum messages to retain in history

---

### defaultTtl?

> `optional` **defaultTtl?**: `number`

Default message TTL in ms

---

### enablePersistence?

> `optional` **enablePersistence?**: `boolean`

Enable message persistence

---

### enableDeadLetterQueue?

> `optional` **enableDeadLetterQueue?**: `boolean`

Dead letter queue for failed messages

---

### requestTimeout?

> `optional` **requestTimeout?**: `number`

Request timeout for request-response pattern
