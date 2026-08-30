[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1327](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1327)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1328](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1328)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1329](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1329)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1330](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1330)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1331](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1331)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1332](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1332)

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

Defined in: [types/cli.ts:1340](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1340)

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

Defined in: [types/cli.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1347)

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

Defined in: [types/cli.ts:1353](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1353)

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

Defined in: [types/cli.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1359)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1360)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1361)
