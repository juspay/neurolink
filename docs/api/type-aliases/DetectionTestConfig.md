[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2303)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2304)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2305)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2306)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2307)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2308](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2308)

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

Defined in: [types/providers.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2312)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2313](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2313)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2314](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2314)

#### count

> **count**: `number`
