[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliRedisClient

# Type Alias: CliRedisClient

> **CliRedisClient** = `object`

Defined in: [types/cli.ts:1444](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1444)

Redis client type (awaited return of createRedisClient).

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### get

> **get**: (`key`) => `Promise`\<`string` \| `null`\>

Defined in: [types/cli.ts:1445](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1445)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`string` \| `null`\>

---

### set

> **set**: (`key`, `value`, `options?`) => `Promise`\<`unknown`\>

Defined in: [types/cli.ts:1446](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1446)

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

Defined in: [types/cli.ts:1447](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1447)

#### Parameters

##### key

`string`

#### Returns

`Promise`\<`number`\>

---

### keys

> **keys**: (`pattern`) => `Promise`\<`string`[]\>

Defined in: [types/cli.ts:1448](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1448)

#### Parameters

##### pattern

`string`

#### Returns

`Promise`\<`string`[]\>

---

### quit

> **quit**: () => `Promise`\<`void`\>

Defined in: [types/cli.ts:1449](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1449)

#### Returns

`Promise`\<`void`\>
