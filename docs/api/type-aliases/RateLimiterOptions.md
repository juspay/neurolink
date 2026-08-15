[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RateLimiterOptions

# Type Alias: RateLimiterOptions

> **RateLimiterOptions** = `object`

Defined in: [types/client.ts:1326](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1326)

Rate limiter options

## Properties

### maxRequests

> **maxRequests**: `number`

Defined in: [types/client.ts:1328](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1328)

Maximum requests per window

---

### windowMs

> **windowMs**: `number`

Defined in: [types/client.ts:1330](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1330)

Window size in milliseconds

---

### strategy?

> `optional` **strategy?**: `"queue"` \| `"throw"`

Defined in: [types/client.ts:1332](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1332)

Strategy when limit is reached: 'queue' or 'throw'

---

### onRateLimited?

> `optional` **onRateLimited?**: (`waitTime`) => `void`

Defined in: [types/client.ts:1334](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/client.ts#L1334)

Callback when rate limited

#### Parameters

##### waitTime

`number`

#### Returns

`void`
