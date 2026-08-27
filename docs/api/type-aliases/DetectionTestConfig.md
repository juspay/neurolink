[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2273](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2273)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2274](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2274)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2275](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2275)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2276](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2276)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2277](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2277)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2278](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2278)

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

Defined in: [types/providers.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2282)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2283)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2284)

#### count

> **count**: `number`
