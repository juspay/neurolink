[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisStorageConfig

# Type Alias: RedisStorageConfig

> **RedisStorageConfig** = `object`

Defined in: [types/conversation.ts:609](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L609)

Redis storage configuration

## Properties

### url?

> `optional` **url?**: `string`

Defined in: [types/conversation.ts:611](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L611)

Redis connection URL (e.g., 'rediss://host:6379' for TLS)

---

### username?

> `optional` **username?**: `string`

Defined in: [types/conversation.ts:614](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L614)

Redis username for ACL authentication (optional)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/conversation.ts:617](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L617)

Redis host (default: 'localhost')

---

### port?

> `optional` **port?**: `number`

Defined in: [types/conversation.ts:620](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L620)

Redis port (default: 6379)

---

### password?

> `optional` **password?**: `string`

Defined in: [types/conversation.ts:623](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L623)

Redis password (optional)

---

### db?

> `optional` **db?**: `number`

Defined in: [types/conversation.ts:626](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L626)

Redis database number (default: 0)

---

### keyPrefix?

> `optional` **keyPrefix?**: `string`

Defined in: [types/conversation.ts:629](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L629)

Key prefix for Redis keys (default: 'neurolink:conversation:')

---

### userSessionsKeyPrefix?

> `optional` **userSessionsKeyPrefix?**: `string`

Defined in: [types/conversation.ts:632](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L632)

Key prefix for user sessions mapping (default: derived from keyPrefix)

---

### ttl?

> `optional` **ttl?**: `number`

Defined in: [types/conversation.ts:635](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L635)

Time-to-live in seconds (default: 86400, 24 hours)

---

### connectionOptions?

> `optional` **connectionOptions?**: `object`

Defined in: [types/conversation.ts:638](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/conversation.ts#L638)

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
