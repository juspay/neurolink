[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisStorageConfig

# Type Alias: RedisStorageConfig

> **RedisStorageConfig** = `object`

Defined in: [types/conversation.ts:726](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L726)

Redis storage configuration

## Properties

### url?

> `optional` **url?**: `string`

Defined in: [types/conversation.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L728)

Redis connection URL (e.g., 'rediss://host:6379' for TLS)

---

### username?

> `optional` **username?**: `string`

Defined in: [types/conversation.ts:731](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L731)

Redis username for ACL authentication (optional)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/conversation.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L734)

Redis host (default: 'localhost')

---

### port?

> `optional` **port?**: `number`

Defined in: [types/conversation.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L737)

Redis port (default: 6379)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/conversation.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L740)

Redis password (optional)

---

### db?

> `optional` **db?**: `number`

Defined in: [types/conversation.ts:743](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L743)

Redis database number (default: 0)

---

### keyPrefix?

> `optional` **keyPrefix?**: `string`

Defined in: [types/conversation.ts:746](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L746)

Key prefix for Redis keys (default: 'neurolink:conversation:')

---

### userSessionsKeyPrefix?

> `optional` **userSessionsKeyPrefix?**: `string`

Defined in: [types/conversation.ts:749](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L749)

Key prefix for user sessions mapping (default: derived from keyPrefix)

---

### ttl?

> `optional` **ttl?**: `number`

Defined in: [types/conversation.ts:752](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L752)

Time-to-live in seconds (default: 86400, 24 hours)

---

### connectionOptions?

> `optional` **connectionOptions?**: `object`

Defined in: [types/conversation.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/conversation.ts#L755)

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
