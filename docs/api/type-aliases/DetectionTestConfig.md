[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2285)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2286](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2286)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2287](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2287)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2288](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2288)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2289)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2290)

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

Defined in: [types/providers.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2294)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2295](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2295)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2296](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2296)

#### count

> **count**: `number`
