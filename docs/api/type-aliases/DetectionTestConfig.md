[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2371)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2372)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2373](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2373)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2374)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2375](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2375)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2376)

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

Defined in: [types/providers.ts:2380](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2380)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2381](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2381)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2382](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2382)

#### count

> **count**: `number`
