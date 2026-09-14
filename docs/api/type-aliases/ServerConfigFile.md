[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1346](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1346)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1347)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1348](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1348)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1349](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1349)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1350](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1350)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1351)

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

Defined in: [types/cli.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1359)

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

Defined in: [types/cli.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1366)

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

Defined in: [types/cli.ts:1372](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1372)

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

Defined in: [types/cli.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1378)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1379](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1379)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1380)
