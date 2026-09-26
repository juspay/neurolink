[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2438](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2438)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2439](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2439)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2440](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2440)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2441](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2441)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2442](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2442)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2443](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2443)

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

Defined in: [types/providers.ts:2447](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2447)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2448](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2448)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2449](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2449)

#### count

> **count**: `number`
