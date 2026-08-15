[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisStorageConfig

# Type Alias: RedisStorageConfig

> **RedisStorageConfig** = `object`

Defined in: [types/conversation.ts:718](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L718)

Redis storage configuration

## Properties

### url?

> `optional` **url?**: `string`

Defined in: [types/conversation.ts:720](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L720)

Redis connection URL (e.g., 'rediss://host:6379' for TLS)

---

### username?

> `optional` **username?**: `string`

Defined in: [types/conversation.ts:723](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L723)

Redis username for ACL authentication (optional)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/conversation.ts:726](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L726)

Redis host (default: 'localhost')

---

### port?

> `optional` **port?**: `number`

Defined in: [types/conversation.ts:729](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L729)

Redis port (default: 6379)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/conversation.ts:732](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L732)

Redis password (optional)

---

### db?

> `optional` **db?**: `number`

Defined in: [types/conversation.ts:735](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L735)

Redis database number (default: 0)

---

### keyPrefix?

> `optional` **keyPrefix?**: `string`

Defined in: [types/conversation.ts:738](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L738)

Key prefix for Redis keys (default: 'neurolink:conversation:')

---

### userSessionsKeyPrefix?

> `optional` **userSessionsKeyPrefix?**: `string`

Defined in: [types/conversation.ts:741](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L741)

Key prefix for user sessions mapping (default: derived from keyPrefix)

---

### ttl?

> `optional` **ttl?**: `number`

Defined in: [types/conversation.ts:744](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L744)

Time-to-live in seconds (default: 86400, 24 hours)

---

### connectionOptions?

> `optional` **connectionOptions?**: `object`

Defined in: [types/conversation.ts:747](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/conversation.ts#L747)

Additional Redis connection options

#### Index Signature

\[`key`: `string`\]: `string` \| `number` \| `boolean` \| `undefined`

#### connectTimeout?

> `optional` **connectTimeout?**: `number`

#### lazyConnect?

> `optional` **lazyConnect?**: `boolean`

#### retryDelayOnFailover?

> `optional` **retryDelayOnFailover?**: `number`

#### maxRetriesPerRequest?

> `optional` **maxRetriesPerRequest?**: `number`
