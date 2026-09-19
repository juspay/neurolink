[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1422](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1422)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1423](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1423)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1424](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1424)

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

Defined in: [types/cli.ts:1425](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1425)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1426](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1426)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1427](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1427)

#### Returns

`Promise`\<`void`\>
