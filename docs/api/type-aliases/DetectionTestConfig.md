[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2374](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2374)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2375](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2375)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2376)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2377](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2377)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2378](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2378)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2379](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2379)

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

Defined in: [types/providers.ts:2383](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2383)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2384](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2384)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2385](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2385)

#### count

> **count**: `number`
