[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SessionConfig

# Type Alias: SessionConfig

> **SessionConfig** = `object`

Session configuration

## Properties

### storage?

> `optional` **storage?**: [`SessionStorageType`](SessionStorageType.md)

Session storage type

---

### duration?

> `optional` **duration?**: `number`

Session duration in seconds

---

### autoRefresh?

> `optional` **autoRefresh?**: `boolean`

Auto-refresh sessions before expiration

---

### refreshThreshold?

> `optional` **refreshThreshold?**: `number`

Refresh threshold in seconds (refresh when this much time remains)

---

### allowMultipleSessions?

> `optional` **allowMultipleSessions?**: `boolean`

Allow multiple sessions per user

---

### maxSessionsPerUser?

> `optional` **maxSessionsPerUser?**: `number`

Maximum sessions per user

---

### prefix?

> `optional` **prefix?**: `string`

Session identifier prefix

---

### customStorage?

> `optional` **customStorage?**: [`SessionStorage`](SessionStorage.md)

Custom session storage implementation

---

### redis?

> `optional` **redis?**: `object`

Redis configuration for distributed sessions

#### url

> **url**: `string`

#### prefix?

> `optional` **prefix?**: `string`

#### ttl?

> `optional` **ttl?**: `number`
