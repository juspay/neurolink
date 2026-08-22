[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1354](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1354)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1355](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1355)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1356](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1356)

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

Defined in: [types/cli.ts:1357](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1357)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1358)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1359)

#### Returns

`Promise`\<`void`\>
