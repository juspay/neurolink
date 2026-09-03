[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2293](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2293)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2294](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2294)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2295](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2295)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2296](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2296)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2297](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2297)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2298](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2298)

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

Defined in: [types/providers.ts:2302](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2302)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2303](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2303)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2304](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2304)

#### count

> **count**: `number`
