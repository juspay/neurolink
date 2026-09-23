[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1328](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1328)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1329](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1329)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1330](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1330)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1331](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1331)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1332](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1332)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1333](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1333)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1337](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1337)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1342](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1342)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
