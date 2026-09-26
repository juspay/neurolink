[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1336](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1336)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1337](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1337)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1338](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1338)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1339](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1339)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1340)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1341](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1341)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1345](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1345)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1350)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
