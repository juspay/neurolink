[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1419](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1419)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1420](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1420)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1421](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1421)

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

Defined in: [types/cli.ts:1422](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1422)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1423](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1423)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1424](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1424)

#### Returns

`Promise`\<`void`\>
