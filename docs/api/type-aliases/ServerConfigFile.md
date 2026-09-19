[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1371](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1371)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1372](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1372)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1373](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1373)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1374](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1374)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1375](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1375)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1376](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1376)

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

Defined in: [types/cli.ts:1384](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1384)

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

Defined in: [types/cli.ts:1391](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1391)

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

Defined in: [types/cli.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1397)

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

Defined in: [types/cli.ts:1403](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1403)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1404)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1405)
