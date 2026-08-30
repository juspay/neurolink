[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1400](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1400)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1401](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1401)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1402](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1402)

#### Parameters

##### key

`string`

##### value

`string`

##### options?

`unknown`

#### Returns

`Promise`\<`unknown`\>

---

### del

> **del**: (`key`) => `Promise`\<`number`\>

Defined in: [types/cli.ts:1403](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1403)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1404](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1404)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1405](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1405)

#### Returns

`Promise`\<`void`\>
