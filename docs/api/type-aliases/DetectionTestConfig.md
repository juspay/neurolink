[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2302)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2303)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2304)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2305](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2305)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2306](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2306)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2307](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2307)

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

Defined in: [types/providers.ts:2311](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2311)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2312](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2312)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2313](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2313)

#### count

> **count**: `number`
