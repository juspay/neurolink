[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1305)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1306](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1306)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1307](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1307)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1308](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1308)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1309](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1309)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1310](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1310)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1314](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1314)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1319)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
