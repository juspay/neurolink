[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1450](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1450)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1451](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1451)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1452](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1452)

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

Defined in: [types/cli.ts:1453](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1453)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1454](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1454)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1455](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1455)

#### Returns

`Promise`\<`void`\>
