[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DetectionTestConfig

# Type Alias: DetectionTestConfig

> **DetectionTestConfig** = `object`

Defined in: [types/providers.ts:2367](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2367)

Configuration object for a detection test wrapper.

## Properties

### test

> **test**: () => `Promise`\<`void`\>

Defined in: [types/providers.ts:2368](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2368)

#### Returns

`Promise`\<`void`\>

---

### index

> **index**: `number`

Defined in: [types/providers.ts:2369](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2369)

---

### testName

> **testName**: `string`

Defined in: [types/providers.ts:2370](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2370)

---

### endpointName

> **endpointName**: `string`

Defined in: [types/providers.ts:2371](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2371)

---

### semaphore

> **semaphore**: `object`

Defined in: [types/providers.ts:2372](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2372)

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

Defined in: [types/providers.ts:2376](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2376)

#### Returns

`void`

---

### maxRateLimitRetries

> **maxRateLimitRetries**: `number`

Defined in: [types/providers.ts:2377](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2377)

---

### rateLimitState

> **rateLimitState**: `object`

Defined in: [types/providers.ts:2378](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2378)

#### count

> **count**: `number`
