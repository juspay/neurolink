[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1334](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1334)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1335](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1335)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1336](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1336)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1337](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1337)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1338](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1338)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1339](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1339)

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

Defined in: [types/cli.ts:1347](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1347)

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

Defined in: [types/cli.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1354)

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

Defined in: [types/cli.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1360)

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

Defined in: [types/cli.ts:1366](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1366)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1367](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1367)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1368](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1368)
