[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitStorage

# Type Alias: RateLimitStorage

> **RateLimitStorage** = `object`

Defined in: [types/auth.ts:1375](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1375)

Storage contract for rate-limit buckets (memory or Redis).

## Methods

### getBucket()

> **getBucket**(`userId`): `Promise`\<[`TokenBucket`](TokenBucket.md) \| `null`\>

Defined in: [types/auth.ts:1376](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1376)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`TokenBucket`](TokenBucket.md) \| `null`\>

---

### setBucket()

> **setBucket**(`userId`, `bucket`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1377](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1377)

#### Parameters

##### userId

`string`

##### bucket

[`TokenBucket`](TokenBucket.md)

#### Returns

`Promise`\<`void`\>

---

### deleteBucket()

> **deleteBucket**(`userId`): `Promise`\<`void`\>

Defined in: [types/auth.ts:1378](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1378)

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### healthCheck()

> **healthCheck**(): `Promise`\<`boolean`\>

Defined in: [types/auth.ts:1379](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1379)

#### Returns

`Promise`\<`boolean`\>

---

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [types/auth.ts:1380](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1380)

#### Returns

`Promise`\<`void`\>

---

### atomicConsume()?

> `optional` **atomicConsume**(`userId`, `limit`, `windowMs`, `nowMs`): `Promise`\<[`AtomicConsumeResult`](AtomicConsumeResult.md) \| `null`\>

Defined in: [types/auth.ts:1381](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/auth.ts#L1381)

#### Parameters

##### userId

`string`

##### limit

`number`

##### windowMs

`number`

##### nowMs

`number`

#### Returns

`Promise`\<[`AtomicConsumeResult`](AtomicConsumeResult.md) \| `null`\>
