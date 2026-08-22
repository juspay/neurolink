[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2253](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2253)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2254](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2254)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2255](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2255)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2256](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2256)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2257](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2257)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2258](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2258)

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

Defined in: [types/providers.ts:2262](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2262)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2263](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2263)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2264](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2264)

#### count

> **count**: `number`
