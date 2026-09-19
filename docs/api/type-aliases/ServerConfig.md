[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1310)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1311)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1312](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1312)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1313](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1313)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1314)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1315](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1315)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1319)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1324](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1324)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
