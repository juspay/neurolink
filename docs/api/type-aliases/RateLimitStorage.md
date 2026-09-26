[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimitStorage

# Type Alias: RateLimitStorage

> **RateLimitStorage** = `object`

Storage contract for rate-limit buckets (memory or Redis).

## Methods

### getBucket()

> **getBucket**(`userId`): `Promise`\<[`TokenBucket`](TokenBucket.md) \| `null`\>

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<[`TokenBucket`](TokenBucket.md) \| `null`\>

---

### setBucket()

> **setBucket**(`userId`, `bucket`): `Promise`\<`void`\>

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

#### Parameters

##### userId

`string`

#### Returns

`Promise`\<`void`\>

---

### healthCheck()

> **healthCheck**(): `Promise`\<`boolean`\>

#### Returns

`Promise`\<`boolean`\>

---

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

---

### atomicConsume()?

> `optional` **atomicConsume**(`userId`, `limit`, `windowMs`, `nowMs`): `Promise`\<[`AtomicConsumeResult`](AtomicConsumeResult.md) \| `null`\>

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
