[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2310](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2310)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2311](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2311)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2312)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2313](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2313)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2314)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2315](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2315)

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

Defined in: [types/providers.ts:2319](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2319)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2320](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2320)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2321](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2321)

#### count

> **count**: `number`
