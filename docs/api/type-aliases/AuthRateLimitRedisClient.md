[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRateLimitRedisClient

# Type Alias: AuthRateLimitRedisClient

> **AuthRateLimitRedisClient** = `object`

Defined in: [types/auth.ts:1394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1394)

Minimal Redis client shape used by the rate-limiter to avoid a hard
dependency on the full `RedisClientType`. Named with an Auth prefix to
avoid collision with `RedisClientType` from the redis package.

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1395)

#### Returns

`Promise`\<`void`\>

---

### quit()

> **quit**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1396)

#### Returns

`Promise`\<`void`\>

---

### ping()

> **ping**(): `Promise`\<`string`\>

Defined in: [types/auth.ts:1397](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1397)

#### Returns

`Promise`\<`string`\>

---

### get()

> **get**(`key`): `Promise`\<`string` \| `null`\>

Defined in: [types/auth.ts:1398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1398)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### setEx()

> **setEx**(`key`, `seconds`, `value`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1399](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1399)

#### Parameters

##### key

`string`

##### seconds

`number`

##### value

`string`

#### Returns

`Promise`\<`void`\>

---

### del()

> **del**(`key`): `Promise`\<`number`\>

Defined in: [types/auth.ts:1400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1400)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### eval()

> **eval**(`script`, `numkeys`, ...`args`): `Promise`\<`unknown`\>

Defined in: [types/auth.ts:1401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L1401)

#### Parameters

##### script

`string`

##### numkeys

`number`

##### args

...`string`[]

#### Returns

`Promise`\<`unknown`\>
