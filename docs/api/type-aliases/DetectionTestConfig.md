[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2288](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2288)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2289)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2290)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2291)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2292](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2292)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2293)

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

Defined in: [types/providers.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2297)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2298)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2299](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2299)

#### count

> **count**: `number`
