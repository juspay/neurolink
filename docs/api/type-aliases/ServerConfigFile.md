[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1285](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1285)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1286)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1287](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1287)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1288](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1288)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1289](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1289)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1290](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1290)

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

Defined in: [types/cli.ts:1298](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1298)

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

Defined in: [types/cli.ts:1305](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1305)

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

Defined in: [types/cli.ts:1311](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1311)

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

Defined in: [types/cli.ts:1317](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1317)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1318](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1318)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1319](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1319)
