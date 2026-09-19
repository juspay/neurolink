[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1349](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1349)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1350)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1351)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1352](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1352)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1353)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1354)

#### enabled?

> `optional` **enabled?**: `boolean`

#### origins?

> `optional` **origins?**: `string`[]

#### methods?

> `optional` **methods?**: `string`[]

#### headers?

> `optional` **headers?**: `string`[]

#### credentials?

> `optional` **credentials?**: `boolean`

#### maxAge?

> `optional` **maxAge?**: `number`

---

### rateLimit?

> `optional` **rateLimit?**: `object`

Defined in: [types/cli.ts:1362](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1362)

#### enabled?

> `optional` **enabled?**: `boolean`

#### windowMs?

> `optional` **windowMs?**: `number`

#### maxRequests?

> `optional` **maxRequests?**: `number`

#### message?

> `optional` **message?**: `string`

#### skipPaths?

> `optional` **skipPaths?**: `string`[]

---

### bodyParser?

> `optional` **bodyParser?**: `object`

Defined in: [types/cli.ts:1369](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1369)

#### enabled?

> `optional` **enabled?**: `boolean`

#### maxSize?

> `optional` **maxSize?**: `string`

#### jsonLimit?

> `optional` **jsonLimit?**: `string`

#### urlEncoded?

> `optional` **urlEncoded?**: `boolean`

---

### logging?

> `optional` **logging?**: `object`

Defined in: [types/cli.ts:1375](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1375)

#### enabled?

> `optional` **enabled?**: `boolean`

#### level?

> `optional` **level?**: `"debug"` \| `"info"` \| `"warn"` \| `"error"`

#### includeBody?

> `optional` **includeBody?**: `boolean`

#### includeResponse?

> `optional` **includeResponse?**: `boolean`

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/cli.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1381)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1382)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1383](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1383)
