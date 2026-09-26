[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RedisStorageConfig

# Type Alias: RedisStorageConfig

> **RedisStorageConfig** = `object`

Redis storage configuration

## Properties

### url?

> `optional` **url?**: `string`

Redis connection URL (e.g., 'rediss://host:6379' for TLS)

---

### username?

> `optional` **username?**: `string`

Redis username for ACL authentication (optional)

---

### host?

> `optional` **host?**: `string`

Redis host (default: 'localhost')

---

### port?

> `optional` **port?**: `number`

Redis port (default: 6379)

---

### password?

> `optional` **password?**: `string`

Redis password (optional)

---

### db?

> `optional` **db?**: `number`

Redis database number (default: 0)

---

### keyPrefix?

> `optional` **keyPrefix?**: `string`

Key prefix for Redis keys (default: 'neurolink:conversation:')

---

### userSessionsKeyPrefix?

> `optional` **userSessionsKeyPrefix?**: `string`

Key prefix for user sessions mapping (default: derived from keyPrefix)

---

### ttl?

> `optional` **ttl?**: `number`

Time-to-live in seconds (default: 86400, 24 hours)

---

### connectionOptions?

> `optional` **connectionOptions?**: `object`

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
