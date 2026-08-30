[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1286)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1287)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1288)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1289)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1290)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1291)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1295](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1295)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1300](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1300)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
