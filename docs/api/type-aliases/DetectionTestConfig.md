[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2272](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2272)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2273)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2274)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2275)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2276)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2277)

#### acquire()

> **acquire**(): `Promise`\<`void`\>

##### Returns

`Promise`\<`void`\>

#### release()

> **release**(): `void`

##### Returns

`void`

---

### incrementRateLimit

> **incrementRateLimit**: () => `void`

Defined in: [types/providers.ts:2281](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2281)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2282)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2283)

#### count

> **count**: `number`
