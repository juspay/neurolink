[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1244](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1244)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1245](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1245)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1246](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1246)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1247)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1248](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1248)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1249](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1249)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1253](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1253)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1258](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1258)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
