[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

---

### defaultHost

> **defaultHost**: `string`

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

---

### defaultBasePath

> **defaultBasePath**: `string`

---

### cors

> **cors**: `object`

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
