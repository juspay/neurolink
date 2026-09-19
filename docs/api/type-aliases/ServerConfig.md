[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1308)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1309](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1309)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1310)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1311)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1312)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1313)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1317](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1317)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1322](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1322)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
