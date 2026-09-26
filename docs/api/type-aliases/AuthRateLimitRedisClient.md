[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRateLimitRedisClient

# Type Alias: AuthRateLimitRedisClient

> **AuthRateLimitRedisClient** = `object`

Minimal Redis client shape used by the rate-limiter to avoid a hard
dependency on the full `RedisClientType`. Named with an Auth prefix to
avoid collision with `RedisClientType` from the redis package.

## Methods

### connect()

> **connect**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### quit()

> **quit**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### ping()

> **ping**(): `Promise`\<`string`\>

#### Returns

`Promise`\<`string`\>

---

### get()

> **get**(`key`): `Promise`\<`string` \| `null`\>

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### setEx()

> **setEx**(`key`, `seconds`, `value`): `Promise`\<`void`\>

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

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### eval()

> **eval**(`script`, `numkeys`, ...`args`): `Promise`\<`unknown`\>

#### Parameters

##### script

`string`

##### numkeys

`number`

##### args

...`string`[]

#### Returns

`Promise`\<`unknown`\>
