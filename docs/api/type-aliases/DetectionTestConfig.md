[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2391](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2391)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2392](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2392)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2393](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2393)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2394](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2394)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2395](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2395)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2396](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2396)

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

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2401)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2402)

#### count

> **count**: `number`
