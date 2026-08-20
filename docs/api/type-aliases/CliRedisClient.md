[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1358](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1358)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1359](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1359)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1360](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1360)

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

Defined in: [types/cli.ts:1361](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1361)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1362](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1362)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1363](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1363)

#### Returns

`Promise`\<`void`\>
