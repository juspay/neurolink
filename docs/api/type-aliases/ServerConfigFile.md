[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerConfigFile

# Type Alias: ServerConfigFile

> **ServerConfigFile** = `object`

Defined in: [types/cli.ts:1377](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1377)

Server configuration file format

## Properties

### port?

> `optional` **port?**: `number`

Defined in: [types/cli.ts:1378](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1378)

---

### host?

> `optional` **host?**: `string`

Defined in: [types/cli.ts:1379](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1379)

---

### framework?

> `optional` **framework?**: [`ServerFramework`](ServerFramework.md)

Defined in: [types/cli.ts:1380](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1380)

---

### basePath?

> `optional` **basePath?**: `string`

Defined in: [types/cli.ts:1381](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1381)

---

### cors?

> `optional` **cors?**: `object`

Defined in: [types/cli.ts:1382](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1382)

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

Defined in: [types/cli.ts:1390](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1390)

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

Defined in: [types/cli.ts:1397](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1397)

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

Defined in: [types/cli.ts:1403](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1403)

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

Defined in: [types/cli.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1409)

---

### enableMetrics?

> `optional` **enableMetrics?**: `boolean`

Defined in: [types/cli.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1410)

---

### enableSwagger?

> `optional` **enableSwagger?**: `boolean`

Defined in: [types/cli.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1411)
