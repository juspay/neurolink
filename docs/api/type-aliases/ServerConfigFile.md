[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1331](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1331)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1332](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1332)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1333](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1333)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1334)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1335)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1336](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1336)

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

Defined in: [types/cli.ts:1344](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1344)

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

Defined in: [types/cli.ts:1351](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1351)

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

Defined in: [types/cli.ts:1357](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1357)

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

Defined in: [types/cli.ts:1363](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1363)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1364](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1364)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1365](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1365)
