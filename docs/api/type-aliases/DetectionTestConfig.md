[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2280](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2280)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2281](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2281)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2282](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2282)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2283](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2283)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2284](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2284)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2285](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2285)

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

Defined in: [types/providers.ts:2289](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2289)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2290](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2290)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2291](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2291)

#### count

> **count**: `number`
