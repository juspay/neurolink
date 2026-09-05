[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfig

# Type Alias: ServerConfig

> **ServerConfig** = `object`

Defined in: [types/cli.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1290)

Server configuration stored in config file

## Properties

### defaultPort

> **defaultPort**: `number`

Defined in: [types/cli.ts:1291](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1291)

---

### defaultHost

> **defaultHost**: `string`

Defined in: [types/cli.ts:1292](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1292)

---

### defaultFramework

> **defaultFramework**: `"hono"` \| `"express"` \| `"fastify"` \| `"koa"`

Defined in: [types/cli.ts:1293](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1293)

---

### defaultBasePath

> **defaultBasePath**: `string`

Defined in: [types/cli.ts:1294](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1294)

---

### cors

> **cors**: `object`

Defined in: [types/cli.ts:1295](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1295)

#### enabled

> **enabled**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

---

### rateLimit

> **rateLimit**: `object`

Defined in: [types/cli.ts:1299](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1299)

#### enabled

> **enabled**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

---

### swagger

> **swagger**: `object`

Defined in: [types/cli.ts:1304](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1304)

#### enabled

> **enabled**: `boolean`

#### path?

> `optional` **path?**: `string`
