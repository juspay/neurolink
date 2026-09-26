[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2398](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2398)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2399](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2399)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2400](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2400)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2401](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2401)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2402](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2402)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2403](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2403)

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

Defined in: [types/providers.ts:2407](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2407)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2408](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2408)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2409](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2409)

#### count

> **count**: `number`
