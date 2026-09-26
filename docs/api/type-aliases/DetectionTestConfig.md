[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2401)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2402)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2403)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2404](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2404)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2405](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2405)

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

Defined in: [types/providers.ts:2409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2409)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2410](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2410)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2411](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2411)

#### count

> **count**: `number`
