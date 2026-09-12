[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1407](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1407)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1408](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1408)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1409](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1409)

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

Defined in: [types/cli.ts:1410](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1410)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1411](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1411)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1412](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1412)

#### Returns

`Promise`\<`void`\>
